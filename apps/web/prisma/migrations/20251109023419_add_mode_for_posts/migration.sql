-- CreateEnum
CREATE TYPE "PostMode" AS ENUM ('MARKDOWN', 'MDX');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "postMode" "PostMode" NOT NULL DEFAULT 'MARKDOWN';
