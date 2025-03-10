import { Hono } from "hono"
import type { JwtVariables } from "./lib/jwtAuth.js"
import { getConfig } from "./lib/appConfig.js"

const configApi = new Hono<{ Variables: JwtVariables }>()

/* Get app config */
configApi.get("/get", async (c) => {
  const config = await getConfig()
  return c.json(config)
})

export default configApi
