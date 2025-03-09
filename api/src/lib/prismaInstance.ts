import { PrismaClient } from "@prisma/client"

/**
 * @description Global instance of the Prisma client
 */
const prisma = new PrismaClient()

export default prisma
