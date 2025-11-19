/*
  Warnings:

  - The primary key for the `Media` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `filename` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Media` table. All the data in the column will be lost.
  - The `id` column on the `Media` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[shortHash]` on the table `Media` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `exif` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shortHash` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageUrl` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnails` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- DropForeignKey
ALTER TABLE "public"."Media" DROP CONSTRAINT "Media_postId_fkey";

-- DropIndex
DROP INDEX "public"."Media_filename_idx";

-- DropIndex
DROP INDEX "public"."Media_hash_key";

-- DropIndex
DROP INDEX "public"."Media_mimeType_idx";

-- AlterTable
ALTER TABLE "public"."Media" DROP CONSTRAINT "Media_pkey",
DROP COLUMN "filename",
DROP COLUMN "postId",
DROP COLUMN "url",
ADD COLUMN     "blur" VARCHAR(2048),
ADD COLUMN     "exif" JSONB NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "inGallery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOptimized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mediaType" "public"."MediaType" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN     "shortHash" VARCHAR(12) NOT NULL,
ADD COLUMN     "storageUrl" VARCHAR(500) NOT NULL,
ADD COLUMN     "thumbnails" JSONB NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Media_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "public"."_MediaToPost" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MediaToPost_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MediaToPost_B_index" ON "public"."_MediaToPost"("B");

-- CreateIndex
CREATE INDEX "Media_shortHash_idx" ON "public"."Media"("shortHash");

-- CreateIndex
CREATE INDEX "Media_inGallery_idx" ON "public"."Media"("inGallery");

-- CreateIndex
CREATE INDEX "Media_fileName_idx" ON "public"."Media"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "Media_shortHash_key" ON "public"."Media"("shortHash");

-- AddForeignKey
ALTER TABLE "public"."_MediaToPost" ADD CONSTRAINT "_MediaToPost_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MediaToPost" ADD CONSTRAINT "_MediaToPost_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
