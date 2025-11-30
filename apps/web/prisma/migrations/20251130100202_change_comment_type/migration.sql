-- DropIndex
DROP INDEX "Media_shortHash_idx";

-- DropIndex
DROP INDEX "Page_slug_idx";

-- DropIndex
DROP INDEX "StorageProvider_isDefault_idx";

-- DropIndex
DROP INDEX "User_username_idx";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "authorWebsite" VARCHAR(255);
