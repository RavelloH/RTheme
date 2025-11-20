/*
  Warnings:

  - You are about to drop the column `allowedTypes` on the `StorageProvider` table. All the data in the column will be lost.
  - Added the required column `baseUrl` to the `StorageProvider` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."StorageProviderType" AS ENUM ('LOCAL', 'AWS_S3', 'GITHUB_PAGES', 'VERCEL_BLOB');

-- AlterTable
ALTER TABLE "public"."StorageProvider" DROP COLUMN "allowedTypes",
ADD COLUMN     "baseUrl" VARCHAR(255) NOT NULL,
ADD COLUMN     "type" "public"."StorageProviderType" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "maxFileSize" SET DEFAULT 52428800;
