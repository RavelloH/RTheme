/*
  Warnings:

  - You are about to drop the column `score` on the `HealthCheck` table. All the data in the column will be lost.
  - You are about to drop the `RateLimitRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "HealthCheck" DROP COLUMN "score";

-- DropTable
DROP TABLE "public"."RateLimitRecord";
