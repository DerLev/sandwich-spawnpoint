import { Hono } from "hono"
import userApi from "./userApi.js"
import orderApi from "./orderApi.js"
import ingredientApi from "./ingredientApi.js"
import syncApi from "./syncApi.js"
import configApi from "./configApi.js"

const api = new Hono()

api.get("/", (c) => {
  /* NOTE: Maybe do some docs here? */
  return c.json({ code: 200, msg: "Hello World!" })
})

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
