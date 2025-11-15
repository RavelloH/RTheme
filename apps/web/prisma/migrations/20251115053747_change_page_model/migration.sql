/*
  Warnings:

  - The values [DRAFT] on the enum `PageStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `excerpt` on the `Page` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PageStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "public"."Page" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Page" ALTER COLUMN "status" TYPE "PageStatus_new" USING ("status"::text::"PageStatus_new");
ALTER TYPE "PageStatus" RENAME TO "PageStatus_old";
ALTER TYPE "PageStatus_new" RENAME TO "PageStatus";
DROP TYPE "public"."PageStatus_old";
ALTER TABLE "Page" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Page" DROP COLUMN "excerpt",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
