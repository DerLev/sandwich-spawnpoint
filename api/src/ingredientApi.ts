import { Hono } from "hono"
import { jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import { z } from "zod"
import errorResponse, { bodyErrorResponse } from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { $Enums } from "@prisma/client"
import { fromError } from "zod-validation-error"

const ingredientApi = new Hono<{ Variables: JwtVariables }>()

/**
 * @description Query params validation schema for listing ingredients
 */
const ingredientListSchema = z.object({
  all: z.enum(["true", "false"]).optional(),
})

/* Restrict listing of ingredients to authenticated users */
ingredientApi.use("/list", jwtMiddleware())

/* List ingredients */
ingredientApi.get("/list", async (c) => {
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
ingredientApi.use("/*", jwtMiddleware(["ADMIN"]))

/**
 * @description Body validation schema for adding ingredients
 */
const ingredientAddSchema = z.object({
  name: z.string(),
  type: z.nativeEnum($Enums.IngredientTypes),
  enabled: z.boolean().default(true),
})

/* Add ingredient */
ingredientApi.post("/add", async (c) => {
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

  return c.json(ingredient, 201)
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
ingredientApi.patch("/modify/:id", async (c) => {
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
ingredientApi.delete("/delete/:id", async (c) => {
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

  return c.body(null, 204)
})

export default ingredientApi
