/*
  Warnings:

  - You are about to alter the column `resourceId` on the `AuditLog` table. The data in that column could be lost. The data in that column will be cast from `VarChar(10000)` to `VarChar(255)`.

*/
-- DropIndex
DROP INDEX "public"."PageViewArchive_path_date_idx";

-- DropIndex
DROP INDEX "public"."Post_slug_idx";

-- DropIndex
DROP INDEX "public"."Tag_slug_key";

-- DropIndex
DROP INDEX "public"."User_email_idx";

-- AlterTable
ALTER TABLE "public"."AuditLog" ALTER COLUMN "resourceId" SET DATA TYPE VARCHAR(255);
