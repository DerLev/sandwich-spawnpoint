import { CronJob } from "cron"
import prisma from "./prismaInstance.js"
import { expiresIn } from "./jwtAuth.js"
import { cleanupBfAttempts } from "./bruteforceProtection.js"

/* eslint-disable no-console */

/**
 * Database cleanup function
 */
const cronFunction = async () => {
  /* Delete brutefroce attempts */
  try {
    const deletedBruteforce = await cleanupBfAttempts

    if (deletedBruteforce.count > 0) {
      console.log(
        `Deleted ${deletedBruteforce.count} bruteforce attempt${deletedBruteforce.count === 1 ? "" : "s"}`,
      )
    }
  } catch (err) {
    console.error("Error whilst deleting bruteforce attempts:", err)
  }

  /* Delete expired users */
  try {
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - expiresIn * 1000),
        },
      },
    })

    if (deletedUsers.count > 0) {
      console.log(
        `Deleted ${deletedUsers.count} user${deletedUsers.count === 1 ? "" : "s"}`,
      )
    }
  } catch (err) {
    console.error("Error when deleting users:", err)
  }
}

/**
 * @description Default cron job. Cleans up the database. Runs every 10 mins
 */
const cronJob = new CronJob(
  "0 */10 * * * *",
  cronFunction,
  null,
  false,
  "Etc/Utc",
)

export default cronJob
