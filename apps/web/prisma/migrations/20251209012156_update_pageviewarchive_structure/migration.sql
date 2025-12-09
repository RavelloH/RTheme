/*
  Warnings:

  - You are about to drop the column `sessionId` on the `PageView` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `PageViewArchive` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[date]` on the table `PageViewArchive` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PageView_sessionId_idx";

-- DropIndex
DROP INDEX "PageViewArchive_path_date_key";

-- DropIndex
DROP INDEX "PageViewArchive_path_idx";

-- AlterTable
ALTER TABLE "PageView" DROP COLUMN "sessionId";

-- AlterTable
ALTER TABLE "PageViewArchive" DROP COLUMN "path",
ADD COLUMN     "pathStats" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "PageViewArchive_date_key" ON "PageViewArchive"("date");
