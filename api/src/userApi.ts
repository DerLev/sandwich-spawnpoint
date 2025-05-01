import { OpenAPIHono, z, createRoute } from "@hono/zod-openapi"
import { generateJwt, jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import errorResponse, { bodyErrorResponse } from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { $Enums } from "@prisma/client"
import castStringToBoolean from "./lib/castStringToBoolean.js"
import { validateConfigPassword } from "./lib/appConfig.js"
import { addBfAttempt, checkForBruteforce } from "./lib/bruteforceProtection.js"
import { getConnInfo } from "@hono/node-server/conninfo"
import { defaultHook } from "./lib/openApi.js"

const userApi = new OpenAPIHono<{ Variables: JwtVariables }>({ defaultHook })

/**
 * @description Body validation schema for user creation
 */
const userNewSchema = z.object({
  name: z.string(),
})

/* User creation route & validators */
const newRoute = createRoute({
  method: "post",
  path: "/new",
  description: "Create a new user",
  tags: ["Users"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: "User with JWT for authentication",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().cuid(),
            createdAt: z.string().datetime(),
            name: z.string(),
            role: z.nativeEnum($Enums.Role),
            token: z.string().jwt(),
            expiresIn: z.number().int().openapi({ example: 64800 }),
          }),
        },
      },
    },
  },
})

/* User creation */
userApi.openapi(newRoute, async (c) => {
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

  return c.json({ ...User, ...jwt }, 201)
})

/* Restrict userinfo endpoint to logged in users */
userApi.use("/me", jwtMiddleware())

/* Userinfo route */
const meRoute = createRoute({
  method: "get",
  path: "/me",
  description: "Info about the user making the request",
  tags: ["Users"],
  middleware: [jwtMiddleware()] as const,
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "User info",
      content: {
        "application/json": {
          schema: z.object({
            sub: z.string().cuid(),
            name: z.string(),
            iat: z.number().int(),
            exp: z.number().int(),
            role: z.nativeEnum($Enums.Role),
            createdAt: z.string().datetime(),
            expiresAt: z.string().datetime(),
          }),
        },
      },
    },
  },
})

/* Userinfo endpoint */
userApi.openapi(meRoute, (c) => {
  return c.json(c.get("jwtPayload"))
})

/* List users route & validators */
const listRoute = createRoute({
  method: "get",
  path: "/list",
  description: "List users\n\n**Note:** Needs administrator privileges",
  tags: ["Users"],
  middleware: [jwtMiddleware(["ADMIN"])] as const,
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      role: z.nativeEnum($Enums.Role).optional(),
      id: z.string().cuid().optional(),
      orders: z
        .enum(["true", "false"])
        .optional()
        .openapi({ example: "false" }),
    }),
  },
  responses: {
    200: {
      description: "List of users",
      content: {
        "application/json": {
          schema: z
            .object({
              id: z.string().cuid(),
              createdAt: z.string().datetime(),
              name: z.string(),
              role: z.nativeEnum($Enums.Role),
              orders: z
                .object({
                  id: z.string().cuid(),
                  userId: z.string().cuid(),
                  createdAt: z.string().datetime(),
                  modifiedAt: z.string().datetime(),
                  status: z.nativeEnum($Enums.OrderStatus),
                })
                .array()
                .optional(),
            })
            .array(),
        },
      },
    },
  },
})

/* List users */
userApi.openapi(listRoute, async (c) => {
  const query = c.req.valid("query")

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

/* User admin upgrade route & validators */
const upgradeAdminRoute = createRoute({
  method: "post",
  path: "/upgrade/admin",
  description:
    "Upgrade the user making the request to become an admin\n\n**Note:** Cannot be executed by an administrator",
  tags: ["Users"],
  middleware: [jwtMiddleware(["USER", "VIP"])] as const,
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            password: z.string(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Upgraded user's details and jwt",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().cuid(),
            createdAt: z.string().datetime(),
            name: z.string(),
            role: z.nativeEnum($Enums.Role).openapi({ default: "ADMIN" }),
            token: z.string().jwt(),
            expiresIn: z.number().int().openapi({ example: 64800 }),
          }),
        },
      },
    },
  },
})

/* User upgrade to admin */
userApi.openapi(upgradeAdminRoute, async (c) => {
  const body = c.req.valid("json")

  /* Get all info about the client */
  const connectionInfo = getConnInfo(c)

  /* Check if user is not suspected of bruteforcing */
  const isAllowedToContinue = await checkForBruteforce({
    uid: c.get("jwtPayload").sub,
    ip: connectionInfo.remote.address,
    action: "ADMINPROMOTE",
  })

  if (!isAllowedToContinue) {
    throw errorResponse(403, "Not allowed to perform action")
  }

  /* Check if the password is correct */
  const isValid = await validateConfigPassword(
    "adminUpgradePassword",
    body.password,
  )

  if (!isValid) {
    /* Record failed attempt in bruteforce table */
    await addBfAttempt({
      action: "ADMINPROMOTE",
      ip: connectionInfo.remote.address || "::",
      uid: c.get("jwtPayload").sub,
    })
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
