import { Hono } from "hono"
import { proxy } from "hono/proxy"
import { z } from "zod"
import errorResponse from "./lib/errorResponse.js"
import { fromError } from "zod-validation-error"
import toQueryParams from "./lib/toQueryParams.js"
import { jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"

const sync = new Hono<{ Variables: JwtVariables }>()

/**
 * @description Query params validation schema for ElectricSQL sync endpoint
 */
const syncQuerySchema = z.object({
  table: z.string(),
  offset: z.string(),
  live: z.enum(["true", "false"]).optional(),
  cursor: z.string().optional(),
  handle: z.string().optional(),
  where: z.string().optional(),
  columns: z.string().optional(),
  replica: z.string().optional(),
})

/* Restrict sync to authenticated users */
sync.use("/sync", jwtMiddleware())

/* ElectricSQL proxy */
sync.get("/sync", async (c) => {
  /* Validate query params */
  const searchQueryRaw = c.req.query()
  const {
    success,
    data: searchQuery,
    error,
  } = syncQuerySchema.safeParse(searchQueryRaw)
  if (!success) {
    throw errorResponse(
      400,
      "Error in query params: " + fromError(error, { prefix: null }).toString(),
    )
  }

  /* TODO: Restrict electric endpoints here !!! */

  return proxy(
    `${process.env.ELECTRIC_URL as string}/v1/shape?${toQueryParams(searchQuery)}`,
  )
})

export default sync
