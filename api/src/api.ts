import { Hono } from "hono"
import prisma from "./lib/prismaInstance.js"
import { getConfig, validateConfigPassword } from "./lib/appConfig.js"
import errorResponse, { bodyErrorResponse } from "./lib/errorResponse.js"
import { $Enums } from "@prisma/client"
import { generateJwt, jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import { z } from "zod"
import castStringToBoolean from "./lib/castStringToBoolean.js"
import { fromError } from "zod-validation-error"

const api = new Hono<{ Variables: JwtVariables }>()

api.get("/", (c) => {
  /* NOTE: Maybe do some docs here? */
  return c.json({ code: 200, msg: "Hello World!" })
})

/**
 * @description Body validation schema for user creation
 */
const userNewSchema = z.object({
  name: z.string(),
})

/* User creation */
api.post("/user/new", async (c) => {
  /* Validate request body */
  const bodyRaw = await c.req.json().catch(() => {
    throw errorResponse(400, "A JSON body must be supplied")
  })
  const { success, data: body, error } = userNewSchema.safeParse(bodyRaw)
  if (!success) {
    throw bodyErrorResponse(400, error)
  }

  /* Create user */
  const User = await prisma.user.create({
    data: {
      name: body.name,
    },
  })

  /* Create JWT for user */
  const jwt = await generateJwt(User.id, User.name, User.role)

  return c.json({ ...User, ...jwt })
})

/**
 * @description Query params validation schema for listing users
 */
const userListSchema = z.object({
  role: z.nativeEnum($Enums.Role).optional(),
  id: z.string().cuid().optional(),
  orders: z.enum(["true", "false"]).optional(),
})

/* Restrict endpoint to admins only */
api.use("/user/list", jwtMiddleware(["ADMIN"]))

/* List users */
api.get("/user/list", async (c) => {
  /* Validate query params */
  const queryRaw = c.req.query()
  const { success, data: query, error } = userListSchema.safeParse(queryRaw)
  if (!success) {
    throw bodyErrorResponse(400, error, "query")
  }

  /* Query database for list of users */
  const Users = await prisma.user.findMany({
    where: {
      role: query.role,
      id: query.id,
    },
    include: {
      orders: castStringToBoolean(query.orders || ""),
    },
  })

  return c.json(Users)
})

/**
 * @description
 */
const userUpgradeAdminSchema = z.object({
  password: z.string(),
})

/* Restrict admin user upgrades to authenticated users that are currently no admin  */
api.use("/user/upgrade/admin", jwtMiddleware(["USER", "VIP"]))

/* User upgrade to admin */
api.post("/user/upgrade/admin", async (c) => {
  /* Validate the request body */
  const bodyRaw = await c.req.json().catch(() => {
    throw errorResponse(400, "A JSON body must be supplied")
  })
  const {
    success,
    data: body,
    error,
  } = userUpgradeAdminSchema.safeParse(bodyRaw)
  if (!success) {
    throw bodyErrorResponse(400, error)
  }

  /* Check if the password is correct */
  const isValid = await validateConfigPassword(
    "adminUpgradePassword",
    body.password,
  )

  if (!isValid) {
    throw errorResponse(403, "Invalid password")
  }

  /* Update user in DB */
  const newUserData = await prisma.user.update({
    where: {
      id: c.get("jwtPayload").sub,
    },
    data: {
      role: "ADMIN",
    },
  })

  /* Create a new JWT for the user */
  const newJwt = await generateJwt(
    newUserData.id,
    newUserData.name,
    newUserData.role,
    c.get("jwtPayload").exp,
  )

  return c.json({
    ...newUserData,
    ...newJwt,
  })
})

/**
 * @description Body validation schema for order creation
 */
const orderNewSchema = z.object({
  ingredients: z.string().cuid().array(),
})

/* Restrict endpoint to authenticated users */
api.use("/order/new", jwtMiddleware())

/* Order creation */
api.post("/order/new", async (c) => {
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

  return c.json(order)
})

/* Restrict all other order endpoint to admins only */
api.use("/order/*", jwtMiddleware(["ADMIN"]))

/**
 * @description Query params validation schema for listing orders
 */
const orderListSchema = z.object({
  status: z.nativeEnum($Enums.OrderStatus).optional(),
  uid: z.string().cuid().optional(),
})

/* List orders */
api.get("/order/list", async (c) => {
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
api.patch("/order/modify/:id", async (c) => {
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
api.delete("/order/delete/:id", async (c) => {
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

  return c.json({ code: 200, message: "Order deleted" })
})

/**
 * @description Query params validation schema for listing ingredients
 */
const ingredientListSchema = z.object({
  all: z.enum(["true", "false"]).optional(),
})

/* Restrict listing of ingredients to authenticated users */
api.use("/ingredient/list", jwtMiddleware())

/* List ingredients */
api.get("/ingredient/list", async (c) => {
  /* Validate request query params */
  const queryRaw = c.req.query()
  const {
    success,
    data: query,
    error,
  } = ingredientListSchema.safeParse(queryRaw)
  if (!success) {
    throw bodyErrorResponse(400, error, "query")
  }

  /* Display disabled ingredients if param is set and user is admin */
  let withDisabled = false
  if (query.all === "true") {
    if (c.get("jwtPayload").role !== "ADMIN")
      throw errorResponse(403, "You are not allowed to fetch all ingredients")
    withDisabled = true
  }

  const where = withDisabled ? {} : { enabled: true }

  /* Query all ingredients from db */
  const ingredients = await prisma.ingredient.findMany({
    where,
    include: {
      _count: {
        select: { orders: true },
      },
    },
  })

  return c.json(ingredients)
})

/* Restrict all other ingredient endpoints to admins only */
api.use("/ingredient/*", jwtMiddleware(["ADMIN"]))

/**
 * @description Body validation schema for adding ingredients
 */
const ingredientAddSchema = z.object({
  name: z.string(),
  type: z.nativeEnum($Enums.IngredientTypes),
  enabled: z.boolean().default(true),
})

/* Add ingredient */
api.post("/ingredient/add", async (c) => {
  /* Validate request body */
  const bodyRaw = await c.req.json().catch(() => {
    throw errorResponse(400, "A JSON body must be supplied")
  })
  const { success, data: body, error } = ingredientAddSchema.safeParse(bodyRaw)
  if (!success) {
    throw bodyErrorResponse(400, error)
  }

  /* Create ingredient in db */
  const ingredient = await prisma.ingredient.create({ data: body })

  return c.json(ingredient)
})

/**
 * @description Body validation schema for modifying ingredients
 */
const ingredientModifySchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum($Enums.IngredientTypes).optional(),
  enabled: z.boolean().optional(),
})

/* Modify ingredient */
api.patch("/ingredient/modify/:id", async (c) => {
  /* Validate id in url */
  const id = c.req.param("id")
  const { success: successParam, error: errorParam } = z
    .string()
    .cuid()
    .safeParse(id)
  if (!successParam) {
    throw errorResponse(
      400,
      "Issue with id: " + fromError(errorParam, { prefix: null }).toString(),
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
  } = ingredientModifySchema.safeParse(bodyRaw)
  if (!successBody) {
    throw bodyErrorResponse(400, errorBody)
  }

  /* Get ingredient from db */
  const ingredient = await prisma.ingredient.findFirst({
    where: { id },
    select: {
      id: true,
    },
  })

  /* Throw if ingredient does not exist */
  if (!ingredient) {
    throw errorResponse(404, "Ingredient does not exist")
  }

  /* Update ingredient in db */
  const updatedIngredient = await prisma.ingredient.update({
    where: { id },
    data: body,
  })

  return c.json(updatedIngredient)
})

/* Delete ingredient */
api.delete("/ingredient/delete/:id", async (c) => {
  /* Validate id in url */
  const id = c.req.param("id")
  const { success, error } = z.string().cuid().safeParse(id)
  if (!success) {
    throw errorResponse(
      400,
      "Issue with id: " + fromError(error, { prefix: null }).toString(),
    )
  }

  /* Check if ingredient does exist */
  const ingredient = await prisma.ingredient.findFirst({
    where: { id },
    include: {
      _count: { select: { orders: true } },
    },
  })

  if (!ingredient) {
    throw errorResponse(404, "Ingredient does not exist")
  }

  /* Throw if ingredient is assigned to some orders */
  if (ingredient._count.orders !== 0) {
    throw errorResponse(
      400,
      "Ingredient cannot be deleted. Has orders assigned!",
    )
  }

  /* Delete ingredient from db */
  await prisma.ingredient
    .delete({
      where: { id },
    })
    .catch((err) => {
      throw errorResponse(500, "Error with deletion!", err)
    })

  return c.json({ code: 200, message: "Ingredient successfully deleted!" })
})

/* Get app config */
api.get("/config", async (c) => {
  const config = await getConfig()
  return c.json(config)
})

export default api
