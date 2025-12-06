/*
  Warnings:

  - You are about to drop the column `ipStats` on the `PageViewArchive` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "region" VARCHAR(100);

-- AlterTable
ALTER TABLE "PageViewArchive" DROP COLUMN "ipStats",
ADD COLUMN     "cityStats" JSONB,
ADD COLUMN     "countryStats" JSONB,
ADD COLUMN     "regionStats" JSONB;

-- CreateIndex
CREATE INDEX "PageView_country_timestamp_idx" ON "PageView"("country", "timestamp");

-- CreateIndex
CREATE INDEX "PageView_region_timestamp_idx" ON "PageView"("region", "timestamp");

-- CreateIndex
CREATE INDEX "PageView_city_timestamp_idx" ON "PageView"("city", "timestamp");
