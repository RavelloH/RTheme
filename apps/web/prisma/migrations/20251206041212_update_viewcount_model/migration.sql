/*
  Warnings:

  - You are about to drop the column `lastUpdated` on the `ViewCountCache` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[postSlug]` on the table `ViewCountCache` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ViewCountCache_lastUpdated_idx";

-- AlterTable
ALTER TABLE "ViewCountCache" DROP COLUMN "lastUpdated",
ADD COLUMN     "postSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ViewCountCache_postSlug_key" ON "ViewCountCache"("postSlug");

-- AddForeignKey
ALTER TABLE "ViewCountCache" ADD CONSTRAINT "ViewCountCache_postSlug_fkey" FOREIGN KEY ("postSlug") REFERENCES "Post"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
