-- Create GIN indexes for full-text search on Post titles and content
CREATE INDEX IF NOT EXISTS "Post_titleSearchVector_idx" ON "Post" USING GIN ("titleSearchVector");
CREATE INDEX IF NOT EXISTS "Post_contentSearchVector_idx" ON "Post" USING GIN ("contentSearchVector");
CREATE INDEX IF NOT EXISTS "Post_full_search_idx" ON "Post" USING GIN ("titleSearchVector", "contentSearchVector");