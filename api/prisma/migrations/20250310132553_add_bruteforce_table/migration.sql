-- CreateEnum
CREATE TYPE "BruteforceActions" AS ENUM ('ADMINPROMOTE', 'VIPPROMOTE');

-- CreateTable
CREATE TABLE "Bruteforce" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "BruteforceActions" NOT NULL,

    CONSTRAINT "Bruteforce_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Bruteforce" ADD CONSTRAINT "Bruteforce_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
