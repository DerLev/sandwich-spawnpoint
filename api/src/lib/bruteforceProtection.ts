import type { $Enums } from "@prisma/client"
import prisma from "./prismaInstance.js"

/**
 * @description Bruteforce backoff time in seconds
 */
const bfTimeout = 60 * 60 * 20

/**
 * Gets all bruteforce entries from db
 * @returns All bruteforce entries
 */
export const getAllBfEntries = async () => {
  const bruteforceEntries = await prisma.bruteforce.findMany()
  return bruteforceEntries
}

/**
 * Cleanup bruteforce attempts
 */
export const cleanupBfAttempts = prisma.bruteforce.deleteMany({
  where: {
    createdAt: {
      lt: new Date(Date.now() - bfTimeout * 1000),
    },
  },
})

/**
 * Check whether a user can execute an action or not
 * @param input Input object
 * @param input.ip IP to be checked for bruteforce
 * @param input.uid User ID to be checked for bruteforce
 * @param input.action Action to be checked for
 * @returns Boolean whether the bruteforce check showed no signs of bruteforce or not
 */
export const checkForBruteforce = async (input: {
  ip?: string
  uid?: string
  action: $Enums.BruteforceActions
}) => {
  /* One of IP or UID must be supplied */
  if (!input.ip && !input.uid) {
    throw new Error("One of ip or uid must be supplied")
  }

  /* Action allowed */
  let allowAction = true

  /* NOTE: This can be consolidated into one query. This works for now */

  /* If uid is supplied */
  if (input.uid) {
    /* Get all bruteforce attempts by this user */
    const userBruteforceAttempts = await prisma.bruteforce.findMany({
      where: {
        userId: input.uid,
        action: input.action,
      },
    })

    /* Sort all attempts */
    const currentAttempts = userBruteforceAttempts
      .map((item) => {
        if (
          Math.floor(Date.now() / 1000) -
            Math.floor(item.createdAt.getTime() / 1000) <
          bfTimeout
        ) {
          return item.id
        }
        return
      })
      .filter((item) => item !== undefined)

    /* If user had 3 attempts, don't allow action */
    if (currentAttempts.length >= 3) allowAction = false
  }

  /* If ip is supplied */
  if (input.ip) {
    /* Get all bruteforce attempts with this ip */
    const ipBruteforceAttempts = await prisma.bruteforce.findMany({
      where: {
        ip: input.ip,
        action: input.action,
      },
    })

    /* Sort all attempts */
    const currentAttempts = ipBruteforceAttempts
      .map((item) => {
        if (
          Math.floor(Date.now() / 1000) -
            Math.floor(item.createdAt.getTime() / 1000) <
          bfTimeout
        ) {
          return item.id
        }
        return
      })
      .filter((item) => item !== undefined)

    /* If ip had 21 attempts, don't allow action */
    if (currentAttempts.length >= 21) allowAction = false
  }

  return allowAction
}

/**
 *
 * @param input Input object
 * @param input.ip IP to be recorded for bruteforce attempt
 * @param input.uid User ID to be recorded for bruteforce attempt
 * @param input.action Action tried
 */
export const addBfAttempt = async (input: {
  ip: string
  uid?: string
  action: $Enums.BruteforceActions
}) => {
  const attempt = await prisma.bruteforce.create({
    data: {
      action: input.action,
      ip: input.ip,
      user: input.uid ? { connect: { id: input.uid } } : undefined,
    },
  })

  return attempt
}
