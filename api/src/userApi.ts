import { Hono } from "hono"
import { generateJwt, jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import errorResponse, { bodyErrorResponse } from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { z } from "zod"
import { $Enums } from "@prisma/client"
import castStringToBoolean from "./lib/castStringToBoolean.js"
import { validateConfigPassword } from "./lib/appConfig.js"

const userApi = new Hono<{ Variables: JwtVariables }>()

/**
 * @description Body validation schema for user creation
 */
const userNewSchema = z.object({
  name: z.string(),
})

/* User creation */
userApi.post("/new", async (c) => {
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
userApi.use("/list", jwtMiddleware(["ADMIN"]))

/* List users */
userApi.get("/list", async (c) => {
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
userApi.use("/upgrade/admin", jwtMiddleware(["USER", "VIP"]))

/* User upgrade to admin */
userApi.post("/upgrade/admin", async (c) => {
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

export default userApi
