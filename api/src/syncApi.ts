import { Hono } from "hono"
import { proxy } from "hono/proxy"
import { z } from "zod"
import errorResponse from "./lib/errorResponse.js"
import { fromError } from "zod-validation-error"
import toQueryParams from "./lib/toQueryParams.js"
import { jwtMiddleware, type JwtVariables } from "./lib/jwtAuth.js"

const syncApi = new Hono<{ Variables: JwtVariables }>()

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
syncApi.use("/sync", jwtMiddleware())

/* ElectricSQL proxy */
syncApi.get("/sync", async (c) => {
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

  /* Restricted queries for users */
  const allowedQueries = [
    {
      table: '"Order"',
      /* NOTE: No SQL-injection potetial due to this being a signed JWT payload */
      where: `"userId"='${c.get("jwtPayload").sub}'`,
    },
    {
      table: '"Ingredient"',
      where: "enabled=true",
    },
  ]

  const matchedQuery = allowedQueries.findIndex(
    (item) => item.table === searchQuery.table,
  )

  /* Allow all queries to admins */
  if (c.get("jwtPayload").role !== "ADMIN") {
    /* 403 if table is not allowed */
    if (matchedQuery < 0) {
      throw errorResponse(403, "Query is not allowed")
    }

    /* 403 if query does not match the defined where clause */
    if (allowedQueries[matchedQuery].where !== searchQuery.where) {
      throw errorResponse(
        403,
        "Where does not have the allowed value of `" +
          allowedQueries[matchedQuery].where +
          "`",
      )
    }
  }

  /* Proxy the ElectricSQL query */
  return proxy(
    `${process.env.ELECTRIC_URL as string}/v1/shape?${toQueryParams(searchQuery)}`,
  )
})

export default syncApi
