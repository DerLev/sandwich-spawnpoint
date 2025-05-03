import { OpenAPIHono } from "@hono/zod-openapi"
import { serve } from "@hono/node-server"
import { checkAppConfig } from "./lib/appConfig.js"
import api from "./api.js"
import prisma from "./lib/prismaInstance.js"
import { serveStatic } from "@hono/node-server/serve-static"
import { defaultHook } from "./lib/openApi.js"
import cronJob from "./lib/cronJob.js"

/* === ENV defaults === */

/* Default to development mode */
if (!process.env.NODE_ENV?.length) {
  process.env.NODE_ENV = "development"
}

/* If no secret is provided stop right here */
if (!process.env.APP_SECRET?.length) {
  throw new Error("Supply an app secret first! (APP_SECRET)")
}

/* Default for ElectricSQL URL */
if (!process.env.ELECTRIC_URL?.length) {
  /* This defaults to the docker compose url */
  process.env.ELECTRIC_URL = "http://electric:3000"
}

/* === */

const app = new OpenAPIHono({ defaultHook })

if (process.env.NODE_ENV === "production") {
  /* Serve static files */
  app.use("*", serveStatic({ path: "./public" }))
} else {
  app.get("/", (c) => {
    return c.text("The app is currently in development mode!")
  })
}

/* All REST API routes */
app.route("/api", api)

/* Endpoint for monitoring container's health */
app.get("/healthz", (c) => {
  return c.json({ code: 200, message: "Ok" })
})

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
})

/* Generate the OpenAPI Spec json file */
app.doc31("/oas/openapi.json", {
  openapi: "3.1.1",
  info: {
    title: "Sandwich Spawnpoint API",
    version: "1.0.0",
    description: "Sandwich ordering service",
    license: {
      name: "MIT",
      url: "https://raw.githubusercontent.com/DerLev/sandwich-spawnpoint/refs/heads/main/LICENSE",
    },
  },
})

/* eslint-disable no-console */
serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
  },
  async (info) => {
    console.log(
      `Server is running on http://localhost:${info.port} in ${process.env.NODE_ENV} mode`,
    )
    try {
      await prisma.$connect()
      console.log("Connected to DB")

      try {
        await checkAppConfig()
        console.log("Config checked")

        /* Start cron job */
        cronJob.start()
      } catch (err) {
        throw new Error("Could not validate/create app config!", { cause: err })
      }
    } catch (err) {
      throw new Error("Could not connect to DB!", { cause: err })
    }
  },
)
/* eslint-enable */
