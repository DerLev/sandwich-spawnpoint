-- DropForeignKey
ALTER TABLE "Bruteforce" DROP CONSTRAINT "Bruteforce_userId_fkey";

-- AlterTable
ALTER TABLE "Bruteforce" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Bruteforce" ADD CONSTRAINT "Bruteforce_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
