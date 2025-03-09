/*
  Warnings:

  - You are about to drop the column `content` on the `Order` table. All the data in the column will be lost.
  - Added the required column `modifiedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('INQUEUE', 'BEINGMADE', 'DONE');

-- CreateEnum
CREATE TYPE "IngredientTypes" AS ENUM ('BREAD', 'CHEESE', 'MEAT', 'SPECIAL');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "content",
ADD COLUMN     "modifiedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "OrderStatus" NOT NULL;

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IngredientTypes" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientOnOrder" (
    "orderId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "ingredientNumber" INTEGER NOT NULL,

    CONSTRAINT "IngredientOnOrder_pkey" PRIMARY KEY ("orderId","ingredientId")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientOnOrder" ADD CONSTRAINT "IngredientOnOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientOnOrder" ADD CONSTRAINT "IngredientOnOrder_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
