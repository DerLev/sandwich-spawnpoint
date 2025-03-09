import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { ZodError } from "zod"
import { fromError } from "zod-validation-error"

/**
 * Creates a unified http error
 * @param code HTTP status code
 * @param message Message to be displayed
 * @param cause Cause of the error
 * @returns An HTTPException to be thrown
 */
const errorResponse = (
  code: ContentfulStatusCode,
  message: string,
  cause?: unknown,
) => {
  const response = new Response(JSON.stringify({ code, message }), {
    status: code,
    headers: {
      "Content-Type": "application/json",
    },
  })
  return new HTTPException(code, { res: response, message, cause })
}

/**
 * Creates a unified http error for validating bodies with Zod
 * @param code HTTP status code
 * @param error ZodError thrown by Zod
 * @param location Where the error occurred
 * @returns An HTTPException to be thrown
 */
export const bodyErrorResponse = (
  code: ContentfulStatusCode,
  error: ZodError,
  location?: "body" | "query",
) => {
  const message =
    `Issue with request ${location || "body"}: ` +
    fromError(error, { prefix: null }).toString()
  return errorResponse(code, message)
}

export default errorResponse
