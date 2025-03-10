import { $Enums } from "@prisma/client"
import type { Context, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { sign, verify } from "hono/jwt"
import type { SignatureAlgorithm } from "hono/utils/jwt/jwa"
import { z } from "zod"

const jwtAlgorithm: SignatureAlgorithm = "HS256"

const jwtSecret = process.env.APP_SECRET as string

/**
 * @description Validation schema for JWTs payload
 */
const jwtSchema = z.object({
  sub: z.string(),
  name: z.string(),
  iat: z.number(),
  exp: z.number(),
  role: z.nativeEnum($Enums.Role),
})

/**
 * Creates a JWT for a user to authenticate with
 * @param uid UID of the user
 * @param name Name of the user
 * @param role Role the user has in the system
 * @returns A JWT for the user
 */
export const generateJwt = async (
  uid: string,
  name: string,
  role: $Enums.Role,
  exp?: number,
) => {
  const expiresIn = 60 * 60 * 18

  const payload = jwtSchema.parse({
    sub: uid,
    name,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: exp || Math.floor(Date.now() / 1000) + expiresIn,
  })

  const jwt = await sign(payload, jwtSecret, jwtAlgorithm)

  return {
    token: jwt,
    expiresIn,
  }
}

/**
 * Validates a JWT and returns the payload
 * @param jwt JWT to validate
 * @returns The payload of the JWT
 */
export const validateJwt = async (jwt: string) => {
  const payload = await verify(jwt, jwtSecret, jwtAlgorithm).catch((err) => {
    throw new Error("JWT validation failed!", { cause: err })
  })

  const { success, data: res, error } = jwtSchema.safeParse(payload)
  if (!success) {
    throw new Error(error.message, { cause: error.issues })
  }
  return {
    ...res,
    createdAt: new Date(res.iat * 1000),
    expiresAt: new Date(res.exp * 1000),
  }
}

/**
 * @description Type for the Hono context
 */
export type JwtVariables = {
  jwtPayload: Awaited<ReturnType<typeof validateJwt>>
}

/**
 * Hono middleware for authenticating with JWTs
 * @param allowedRoles Array of roles allowed to pass authentication
 * @returns Hono middleware handler
 */
export const jwtMiddleware = (
  allowedRoles?: $Enums.Role[],
): MiddlewareHandler => {
  return async (ctx, next) => {
    /* Get Authorization header from request */
    const authHeader = ctx.req.raw.headers.get("Authorization")

    if (!authHeader) {
      throw authenticationError(
        ctx,
        401,
        "invalid_request",
        "No Authorization header included in request",
      )
    }

    /* Validate header structure */
    const authParts = authHeader.split(/\s+/)
    if (authParts.length !== 2 || authParts[0] !== "Bearer") {
      throw authenticationError(
        ctx,
        401,
        "invalid_request",
        "Invalid creadentials structure",
      )
    }

    const token = authParts[1]
    let payload: Awaited<ReturnType<typeof validateJwt>> | undefined
    let errCause: Error | undefined

    /* Validate token */
    try {
      payload = await validateJwt(token)
    } catch (err) {
      errCause = err as Error
    }

    /* Token validation error */
    if (!payload) {
      throw authenticationError(
        ctx,
        401,
        "invalid_token",
        errCause?.message || "",
        errCause,
      )
    }

    /* If user's roles are insufficient */
    if (
      allowedRoles?.length &&
      allowedRoles.findIndex((role) => role === payload.role) < 0
    ) {
      throw authenticationError(
        ctx,
        403,
        "insufficient_scope",
        "You don't have access to this resource",
      )
    }

    /* Set Hono context variable */
    ctx.set("jwtPayload", payload)

    await next()
  }
}

/**
 * Throw a JWT specific auth error
 * @param ctx Hono middleware context
 * @param code HTTP status code
 * @param error Bearer auth error for WWW-Authenticate
 * @param errDescription Detailed error description
 * @param cause Error cause if available
 * @returns HTTPException for throwing
 */
const authenticationError = (
  ctx: Context,
  code: 401 | 403,
  error: "invalid_request" | "invalid_token" | "insufficient_scope",
  errDescription: string,
  cause?: unknown,
) => {
  const response = new Response(
    JSON.stringify({ code, message: errDescription }),
    {
      status: code,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer realm="${ctx.req.url}",error="${error}",error_description="${errDescription}"`,
      },
    },
  )

  return new HTTPException(code, { message: error, res: response, cause })
}
