import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import { getConfig } from "./lib/appConfig.js"
import errorResponse from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { hash } from "argon2"
import { defaultHook, ErrorSchema } from "./lib/openApi.js"

const configApi = new OpenAPIHono<{ Variables: JwtVariables }>({ defaultHook })

/* Get app config */
const getRoute = createRoute({
  method: "get",
  path: "/get",
  description: "Get the current app config",
  tags: ["App Config"],
  responses: {
    200: {
      description: "Current app config",
    },
  },
})

configApi.openapi(getRoute, async (c) => {
  const config = await getConfig(true)
  return c.json(config)
})

/* Body validation schema for config modifications */
const configModifySchema = z.object({
  object: z.string().openapi({ example: "allowOrders" }),
  value: z
    .union([z.string(), z.boolean(), z.number()])
    .openapi({ example: true }),
})

/* Route definition for config modifications */
const modifyRoute = createRoute({
  method: "patch",
  path: "/modify",
  description:
    "Updates an app config entry\n\n**Note:** Needs administrator privileges",
  tags: ["App Config"],
  security: [{ Bearer: [] }],
  middleware: [jwtMiddleware(["ADMIN"])] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: configModifySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    204: {
      description: "Config key changed",
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
        "Multiple causes:\n* Authorization header is not valid\n* User is not an admin\n* Managing VIP OTPs must be done at `/api/user/vip`",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Config object does not exist",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Error whilst updating config object",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
})

/* Modify config object */
configApi.openapi(modifyRoute, async (c) => {
  const body = c.req.valid("json")

  /* Get config object */
  const currentConfigObject = await prisma.config.findFirst({
    where: {
      key: body.object,
    },
  })

  /* Throw if config object does not exist */
  if (!currentConfigObject) {
    throw errorResponse(404, "Config object does not exist")
  }

  /* Don't allow management of VIP OTPs here */
  if (currentConfigObject.type === "VIPOTPS") {
    throw errorResponse(403, "VIP OTPs cannot be managed here!")
  }

  /* Hash passwords */
  const resValue =
    currentConfigObject.type !== "PASSWORD"
      ? body.value
      : await hash(String(body.value))

  /* Save new value in db */
  await prisma.config
    .update({
      where: { key: body.object },
      data: { value: String(resValue) },
    })
    .catch((err) => {
      throw errorResponse(500, "Error when updating config object", err)
    })

  return c.body(null, 204)
})

export default configApi
