-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "depth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" VARCHAR(2000) NOT NULL DEFAULT '',
ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sortKey" VARCHAR(500) NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Comment_postId_status_sortKey_idx" ON "Comment"("postId", "status", "sortKey");

-- CreateIndex
CREATE INDEX "Comment_postId_status_depth_idx" ON "Comment"("postId", "status", "depth");

-- CreateIndex
CREATE INDEX "Comment_path_idx" ON "Comment"("path");
