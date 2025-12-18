/*
  Warnings:

  - A unique constraint covering the columns `[userUid,provider]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `provider` on the `Account` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AccountProvider" AS ENUM ('GOOGLE', 'GITHUB', 'APPLE');

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "provider",
ADD COLUMN     "provider" "AccountProvider" NOT NULL;

-- CreateIndex
CREATE INDEX "Account_provider_idx" ON "Account"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userUid_provider_key" ON "Account"("userUid", "provider");
