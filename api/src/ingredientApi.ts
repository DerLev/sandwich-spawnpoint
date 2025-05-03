import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import errorResponse from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { $Enums } from "@prisma/client"
import { defaultHook, ErrorSchema } from "./lib/openApi.js"

const ingredientApi = new OpenAPIHono<{ Variables: JwtVariables }>({
  defaultHook,
})

/* Ingredient list route & validators */
const listRoute = createRoute({
  method: "get",
  path: "/list",
  description:
    "Get a list of ingredients\n\n**Note:** Needs administrator privileges for listing all ingredients",
  tags: ["Ingredients"],
  middleware: [jwtMiddleware()] as const,
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      all: z.enum(["true", "false"]).optional().openapi({
        example: "false",
        description:
          "Lists all ingredients or just enabled ones\n\n**Note:** Needs administrator privileges for listing all ingredients",
      }),
    }),
  },
  responses: {
    200: {
      description: "List of ingredients",
      content: {
        "application/json": {
          schema: z
            .object({
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
              _count: z.object({
                orders: z.number().int().openapi({ example: 0 }),
              }),
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

/* List ingredients */
ingredientApi.openapi(listRoute, async (c) => {
  const query = c.req.valid("query")

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

  return c.json(ingredients, 200)
})

/* Restrict all other ingredient endpoints to admins only */
ingredientApi.use("/*", jwtMiddleware(["ADMIN"]))

/* Add ingredients route & validators */
const addRoute = createRoute({
  method: "post",
  path: "/add",
  description:
    "Add ingredients to the database\n\n**Note:** Needs administrator privileges",
  tags: ["Ingredients"],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
            type: z.nativeEnum($Enums.IngredientTypes),
            enabled: z.boolean().default(true),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: "The created database entry",
      content: {
        "application/json": {
          schema: z.object({
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

/* Add ingredient */
ingredientApi.openapi(addRoute, async (c) => {
  const body = c.req.valid("json")

  /* Create ingredient in db */
  const ingredient = await prisma.ingredient.create({ data: body })

  return c.json(ingredient, 201)
})

/* Modify ingredient route & validators */
const modifyRoute = createRoute({
  method: "patch",
  path: "/modify/{id}",
  description:
    "Modify an ingredient\n\n**Note:** Needs administrator privileges",
  tags: ["Ingredients"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().cuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            type: z.nativeEnum($Enums.IngredientTypes).optional(),
            enabled: z.boolean().optional(),
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
      description: "Ingredient does not exist",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/* Modify ingredient */
ingredientApi.openapi(modifyRoute, async (c) => {
  const id = c.req.valid("param").id
  const body = c.req.valid("json")

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

  return c.json(updatedIngredient, 200)
})

/* Delete ingredient route & validators */
const deleteRoute = createRoute({
  method: "delete",
  path: "/delete/{id}",
  description:
    "Delete an ingredient\n\n**Note:** Needs administrator privileges",
  tags: ["Ingredients"],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().cuid(),
    }),
  },
  responses: {
    204: {
      description: "Ingredient is deleted",
    },
    400: {
      description:
        "Multiple causes:\n* Error with input\n* Ingredient is assigned to orders",
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
      description: "Ingredient does not exist",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Ingredient could not be deleted",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/* Delete ingredient */
ingredientApi.openapi(deleteRoute, async (c) => {
  const id = c.req.valid("param").id

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

  return c.body(null, 204)
})

export default ingredientApi
