/*
  Warnings:

  - You are about to drop the column `isDefault` on the `Page` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PageContentType" AS ENUM ('MARKDOWN', 'HTML', 'MDX');

-- DropForeignKey
ALTER TABLE "Page" DROP CONSTRAINT "Page_userUid_fkey";

-- AlterTable
ALTER TABLE "Page" DROP COLUMN "isDefault",
ADD COLUMN     "contentType" "PageContentType" NOT NULL DEFAULT 'MARKDOWN',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isSystemPage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "content" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
