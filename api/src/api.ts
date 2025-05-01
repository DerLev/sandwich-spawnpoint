import { OpenAPIHono } from "@hono/zod-openapi"
import userApi from "./userApi.js"
import orderApi from "./orderApi.js"
import ingredientApi from "./ingredientApi.js"
import syncApi from "./syncApi.js"
import configApi from "./configApi.js"
import { cors } from "hono/cors"
import { swaggerUI } from "@hono/swagger-ui"

const api = new OpenAPIHono()

/* Some CORS */
api.use(cors())

/* Swagger UI */
api.get("/swagger", swaggerUI({ url: "/oas/openapi.json" }))

/* ElectricSQL route */
api.route("/", syncApi)

/* User routes */
api.route("/user", userApi)

/* Order routes */
api.route("/order", orderApi)

/* Ingredient routes */
api.route("/ingredient", ingredientApi)

/* Config routes */
api.route("/config", configApi)

export default api
