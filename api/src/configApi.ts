import { Hono } from "hono"
import { jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"
import { getConfig } from "./lib/appConfig.js"
import { z } from "zod"
import errorResponse, { bodyErrorResponse } from "./lib/errorResponse.js"
import prisma from "./lib/prismaInstance.js"
import { hash } from "argon2"

const configApi = new Hono<{ Variables: JwtVariables }>()

/* Get app config */
configApi.get("/get", async (c) => {
  const config = await getConfig()
  return c.json(config)
})

/* Body validation schema for config modifications */
const configModifySchema = z.object({
  object: z.string(),
  value: z.union([z.string(), z.boolean(), z.number()]),
})

/* Restrict config modifications to admins only */
configApi.use("/modify", jwtMiddleware(["ADMIN"]))

/* Modify config object */
configApi.patch("/modify", async (c) => {
  /* Validate request body */
  const bodyRaw = await c.req.json().catch(() => {
    throw errorResponse(400, "A JSON body must be supplied")
  })
  const { success, data: body, error } = configModifySchema.safeParse(bodyRaw)
  if (!success) {
    throw bodyErrorResponse(400, error)
  }

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
