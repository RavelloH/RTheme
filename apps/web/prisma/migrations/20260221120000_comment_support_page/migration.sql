-- AlterTable
ALTER TABLE "Comment"
ADD COLUMN "pageId" TEXT,
ALTER COLUMN "postId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_pageId_idx" ON "Comment"("pageId");

-- CreateIndex
CREATE INDEX "Comment_pageId_status_idx" ON "Comment"("pageId", "status");

-- CreateIndex
CREATE INDEX "Comment_pageId_status_sortKey_idx" ON "Comment"("pageId", "status", "sortKey");

-- CreateIndex
CREATE INDEX "Comment_pageId_status_depth_idx" ON "Comment"("pageId", "status", "depth");

-- AddForeignKey
ALTER TABLE "Comment"
ADD CONSTRAINT "Comment_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Comment"
ADD CONSTRAINT "Comment_target_check"
CHECK (
  ("postId" IS NOT NULL AND "pageId" IS NULL)
  OR
  ("postId" IS NULL AND "pageId" IS NOT NULL)
);
