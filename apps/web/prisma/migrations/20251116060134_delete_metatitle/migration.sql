/*
  Warnings:

  - You are about to drop the column `metaTitle` on the `Page` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Page" DROP COLUMN "metaTitle";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "metaTitle";
