import { OpenAPIHono, z, createRoute } from "@hono/zod-openapi"
import { jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import { getConfig } from "./lib/appConfig.js"
import errorResponse from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { $Enums } from "@prisma/client"
import { defaultHook, ErrorSchema } from "./lib/openApi.js"

const orderApi = new OpenAPIHono<{ Variables: JwtVariables }>({ defaultHook })

/* Order creation route & validators */
const newRoute = createRoute({
  method: "post",
  path: "/new",
  description: "Create a new order",
  tags: ["Orders"],
  middleware: [jwtMiddleware()] as const,
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            ingredients: z
              .string()
              .cuid()
              .array()
              .openapi({ description: "Array of ingredient ids" }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Order created",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().cuid(),
            status: z.nativeEnum($Enums.OrderStatus),
            userId: z.string().cuid(),
            createdAt: z.string().datetime(),
            modifiedAt: z.string().datetime(),
          }),
        },
      },
    },
    400: {
      description: "Input is invalid",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "No authorization header provided",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description:
        "Multiple causes:\n* Authorization header is not valid\n* Orders are currently disabled",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/* Order creation */
orderApi.openapi(newRoute, async (c) => {
  /* Check if ordering is allowed */
  const { allowOrders } = await getConfig()
  if (!allowOrders) {
    throw errorResponse(403, "Orders are currently disabled")
  }

  const body = c.req.valid("json")

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

/* List orders route & validators */
const listRoute = createRoute({
  method: "get",
  path: "/list",
  description:
    "List orders\n\n**Note:** Needs administrator privileges to list all orders",
  tags: ["Orders"],
  middleware: [jwtMiddleware()] as const,
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      status: z.nativeEnum($Enums.OrderStatus).optional(),
      uid: z.string().cuid().optional(),
    }),
  },
  responses: {
    200: {
      description: "List of orders",
      content: {
        "application/json": {
          schema: z
            .object({
              id: z
                .string()
                .cuid()
                .openapi({ example: "cma5lq0jp0000uixpp28j2tn2" }),
              userId: z
                .string()
                .cuid()
                .openapi({ example: "cma5gkd0w0000uirfnsphed8q" }),
              createdAt: z
                .string()
                .datetime()
                .openapi({ example: "2025-05-01T16:50:50.053Z" }),
              modifiedAt: z
                .string()
                .datetime()
                .openapi({ example: "2025-05-01T16:50:50.053Z" }),
              status: z
                .nativeEnum($Enums.OrderStatus)
                .openapi({ example: "INQUEUE" }),
              ingredients: z
                .object({
                  ingredient: z.object({
                    id: z
                      .string()
                      .cuid()
                      .openapi({ example: "cm81u650u0000uikohrtioywn" }),
                    createdAt: z
                      .string()
                      .datetime()
                      .openapi({ example: "2025-03-09T16:16:49.902Z" }),
                    modifiedAt: z
                      .string()
                      .datetime()
                      .openapi({ example: "2025-03-09T16:16:49.902Z" }),
                    name: z.string().openapi({ example: "Toastbrot" }),
                    type: z
                      .nativeEnum($Enums.IngredientTypes)
                      .openapi({ example: "BREAD" }),
                    enabled: z.boolean().openapi({ example: true }),
                  }),
                  ingredientNumber: z.number().int().openapi({
                    example: 1,
                    description: "The amount of this ingredient",
                  }),
                })
                .array(),
            })
            .array(),
        },
      },
    },
    400: {
      description: "Input is invalid",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "No authorization header provided",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description:
        "Multiple causes:\n* Authorization header is not valid\n* User is not an admin",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/* List orders */
orderApi.openapi(listRoute, async (c) => {
  const query = c.req.valid("query")

  if (c.get("jwtPayload").role !== "ADMIN") {
    if (query.uid === undefined) {
      query.uid = c.get("jwtPayload").sub
    } else if (query.uid !== c.get("jwtPayload").sub) {
      throw errorResponse(403, "User is not allowed to access all orders!")
    }
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

  return c.json(orders, 200)
})

/* Modify order route & validators */
const modifyRoute = createRoute({
  method: "patch",
  path: "/modify/{id}",
  description: "Modify an order\n\n**Note:** Needs administrator privileges",
  tags: ["Orders"],
  middleware: [jwtMiddleware(["ADMIN"])] as const,
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().cuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            ingredients: z.string().cuid().array().optional(),
            status: z.nativeEnum($Enums.OrderStatus).optional(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated database entry",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().cuid(),
            userId: z.string().cuid(),
            createdAt: z.string().datetime(),
            modifiedAt: z.string().datetime(),
            status: z.nativeEnum($Enums.OrderStatus),
          }),
        },
      },
    },
    400: {
      description: "Input is invalid",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "No authorization header provided",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description:
        "Multiple causes:\n* Authorization header is not valid\n* User is not an admin",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "The order specified does not exist",
    },
  },
})

/* Modify order */
orderApi.openapi(modifyRoute, async (c) => {
  const id = c.req.valid("param").id
  const body = c.req.valid("json")

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

    return c.json(modifiedOrder, 200)
  } else {
    /* Update order in db */
    const modifiedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
      },
    })

    return c.json(modifiedOrder, 200)
  }
})

/* Delete order route & validators */
const deleteRoute = createRoute({
  method: "delete",
  path: "/delete/{id}",
  description:
    "Delete an order\n\n**Note:** Non-admins can only delete their orders if they are in queue. Admins can delete all orders",
  tags: ["Orders"],
  middleware: [jwtMiddleware()] as const,
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().cuid(),
    }),
  },
  responses: {
    204: {
      description: "Order got deleted",
    },
    400: {
      description: "Input is invalid",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "No authorization header provided",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description:
        "Multiple causes:\n* Authorization header is not valid\n* User is not an admin\n* Order is not made by the user\n* Order is not in queue",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Order does not exist",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Order could not be deleted",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/* Delete order */
orderApi.openapi(deleteRoute, async (c) => {
  const id = c.req.valid("param").id

  /* Additional checks for non-admins */
  if (c.get("jwtPayload").role !== "ADMIN") {
    const order = await prisma.order.findFirst({
      where: { id },
    })

    if (!order) {
      throw errorResponse(404, "Order could not be found")
    }

    /* Order needs to be owned by the user */
    if (order.userId !== c.get("jwtPayload").sub) {
      throw errorResponse(403, "Order is not made by the User!")
    }

    /* Order needs to have status of "INQUEUE" */
    if (order.status !== "INQUEUE") {
      throw errorResponse(403, "Order is not in queue!")
    }
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
