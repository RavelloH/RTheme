/*
  Warnings:

  - You are about to drop the column `userAgentStats` on the `PageViewArchive` table. All the data in the column will be lost.
  - Added the required column `lastUpdated` to the `ViewCountCache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "duration" INTEGER DEFAULT 0,
ADD COLUMN     "sessionId" VARCHAR(100);

-- AlterTable
ALTER TABLE "PageViewArchive" DROP COLUMN "userAgentStats",
ADD COLUMN     "bounces" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalDuration" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSessions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ViewCountCache" ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "PageView_sessionId_idx" ON "PageView"("sessionId");
