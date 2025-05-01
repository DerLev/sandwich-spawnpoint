import { z, type Hook } from "@hono/zod-openapi"
import { bodyErrorResponse } from "./errorResponse.js"

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const defaultHook: Hook<any, any, any, any> = (result) => {
  if (!result.success) {
    throw bodyErrorResponse(400, result.error)
  }
}

export const ErrorSchema = z
  .object({
    code: z.number().int().openapi({ example: 400 }),
    message: z.string().openapi({ example: "Issue with request body" }),
  })
  .openapi("Error")
