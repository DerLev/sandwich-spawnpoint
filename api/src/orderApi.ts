import { Hono } from "hono"
import type { JwtVariables } from "hono/jwt"
import { z } from "zod"
import { jwtMiddleware } from "./lib/jwtAuth.js"
import { getConfig } from "./lib/appConfig.js"
import errorResponse, { bodyErrorResponse } from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { $Enums } from "@prisma/client"
import { fromError } from "zod-validation-error"

const orderApi = new Hono<{ Variables: JwtVariables }>()

/**
 * @description Body validation schema for order creation
 */
const orderNewSchema = z.object({
  ingredients: z.string().cuid().array(),
})

/* Restrict endpoint to authenticated users */
orderApi.use("/new", jwtMiddleware())

/* Order creation */
orderApi.post("/new", async (c) => {
  /* Check if ordering is allowed */
  const { allowOrders } = await getConfig()
  if (!allowOrders) {
    throw errorResponse(403, "Orders are currently disabled")
  }

  /* Validate request body */
  const bodyRaw = await c.req.json().catch(() => {
    throw errorResponse(400, "A JSON body must be supplied")
  })
  const { success, data: body, error } = orderNewSchema.safeParse(bodyRaw)
  if (!success) {
    throw bodyErrorResponse(400, error)
  }

  /* Format ingredients for prisma orm call */
  const ingredientsConnect = body.ingredients
    .map((ingredient, index, orig) => {
      const count = orig.filter((item) => item === ingredient).length
      if (orig.findIndex((item) => item === ingredient) === index) {
        return {
          ingredientId: ingredient,
          ingredientNumber: count,
        }
      }
      return
    })
    .filter((item) => item !== undefined)

  /* Create order in db */
  const order = await prisma.order.create({
    data: {
      ingredients: {
        create: ingredientsConnect,
      },
      user: {
        connect: { id: c.get("jwtPayload").sub },
      },
    },
  })

  return c.json(order, 201)
})

/* Restrict all other order endpoint to admins only */
orderApi.use("/*", jwtMiddleware(["ADMIN"]))

/**
 * @description Query params validation schema for listing orders
 */
const orderListSchema = z.object({
  status: z.nativeEnum($Enums.OrderStatus).optional(),
  uid: z.string().cuid().optional(),
})

/* List orders */
orderApi.get("/list", async (c) => {
  /* Validate query params */
  const queryRaw = c.req.query()
  const { success, data: query, error } = orderListSchema.safeParse(queryRaw)
  if (!success) {
    throw bodyErrorResponse(400, error, "query")
  }

  /* Get orders from db with constraints from query params */
  const orders = await prisma.order.findMany({
    where: {
      status: query.status,
      userId: query.uid,
    },
    include: {
      ingredients: {
        omit: {
          orderId: true,
          ingredientId: true,
        },
        include: {
          ingredient: true,
        },
      },
    },
  })

  return c.json(orders)
})

/**
 * @description Body validation schema for modifying orders
 */
const orderModifySchema = z.object({
  ingredients: z.string().cuid().array().optional(),
  status: z.nativeEnum($Enums.OrderStatus).optional(),
})

/* Modify order */
orderApi.patch("/modify/:id", async (c) => {
  /* Validate id in url */
  const id = c.req.param("id")
  const { success: successParam, error: errorParam } = z
    .string()
    .cuid()
    .safeParse(id)
  if (!successParam) {
    throw errorResponse(
      400,
      "Issue with id: " + fromError(errorParam, { prefix: null }),
    )
  }

  /* Validate request body */
  const bodyRaw = await c.req.json().catch(() => {
    throw errorResponse(400, "A JSON body must be supplied")
  })
  const {
    success: successBody,
    data: body,
    error: errorBody,
  } = orderModifySchema.safeParse(bodyRaw)
  if (!successBody) {
    throw bodyErrorResponse(400, errorBody)
  }

  /* Get order from db */
  const order = await prisma.order.findFirst({
    where: { id },
    include: { ingredients: { include: { ingredient: true } } },
  })

  /* Throw if order does not exist */
  if (!order) {
    throw errorResponse(404, "Order does not exist")
  }

  /* If ingredients need to be edited */
  if (body.ingredients && body.ingredients.length) {
    /* Format current ingredients */
    const currentIngredients = order.ingredients.map((item) => {
      return {
        id: item.ingredientId,
        amount: item.ingredientNumber,
      }
    })

    /* Format new ingredients from request */
    const newIngredients = body.ingredients
      .map((ingredient, index, array) => {
        const count = array.filter((item) => item === ingredient).length
        if (array.findIndex((item) => item === ingredient) === index) {
          return {
            id: ingredient,
            amount: count,
          }
        }
        return
      })
      .filter((item) => item !== undefined)

    /* Filter for missing ingredients in old array */
    const toBeCreated = newIngredients.filter(
      (ingredient) =>
        currentIngredients.findIndex((item) => item.id === ingredient.id) < 0,
    )

    /* Filter for changed ingredients */
    const toBeEdited = newIngredients.filter((ingredient) => {
      const indexInCurrent = currentIngredients.findIndex(
        (item) => item.id === ingredient.id,
      )
      if (indexInCurrent < 0) return false

      const inCurrent = currentIngredients[indexInCurrent]
      if (inCurrent.amount === ingredient.amount) return false

      return true
    })

    /* Filter for missing ingredients in new array */
    const toBeDeleted = currentIngredients.filter(
      (ingredient) =>
        newIngredients.findIndex((item) => item.id === ingredient.id) < 0,
    )

    /* Filter for untouched ingredients */
    const toBeLeftAlone = currentIngredients.filter(
      (ingredient) =>
        [...toBeCreated, ...toBeEdited, ...toBeDeleted].findIndex(
          (item) => item.id === ingredient.id,
        ) < 0,
    )

    /* Update order in db */
    const modifiedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
        ingredients: {
          create: toBeCreated.map((item) => ({
            ingredientId: item.id,
            ingredientNumber: item.amount,
          })),
          update: toBeEdited.map((item) => ({
            where: {
              orderId_ingredientId: {
                ingredientId: item.id,
                orderId: id,
              },
            },
            data: {
              ingredientNumber: item.amount,
            },
          })),
          delete: toBeDeleted.map((item) => ({
            orderId_ingredientId: {
              ingredientId: item.id,
              orderId: id,
            },
          })),
          connect: toBeLeftAlone.map((item) => ({
            orderId_ingredientId: {
              orderId: id,
              ingredientId: item.id,
            },
          })),
        },
      },
    })

    return c.json(modifiedOrder)
  } else {
    /* Update order in db */
    const modifiedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
      },
    })

    return c.json(modifiedOrder)
  }
})

/* Delete order */
orderApi.delete("/delete/:id", async (c) => {
  /* Validate id in url */
  const id = c.req.param("id")
  const { success, error } = z.string().cuid().safeParse(id)
  if (!success) {
    throw errorResponse(
      400,
      "Issue with id: " + fromError(error, { prefix: null }).toString(),
    )
  }

  /* Delete order in db */
  await prisma.order
    .delete({
      where: { id },
    })
    .catch((err) => {
      throw errorResponse(500, "Could not delete order", err)
    })

  return c.body(null, 204)
})

export default orderApi
