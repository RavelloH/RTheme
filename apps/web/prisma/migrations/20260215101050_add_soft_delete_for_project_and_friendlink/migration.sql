-- DropIndex
DROP INDEX "Post_full_search_idx";

-- AlterTable
ALTER TABLE "FriendLink" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "FriendLink_deletedAt_idx" ON "FriendLink"("deletedAt");

-- CreateIndex
CREATE INDEX "FriendLink_status_deletedAt_idx" ON "FriendLink"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Project_status_deletedAt_idx" ON "Project"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");
