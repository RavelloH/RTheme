/*
  Warnings:

  - Added the required column `title` to the `Notice` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add title column as nullable first
ALTER TABLE "public"."Notice" ADD COLUMN "title" TEXT;

-- Step 2: Populate title from existing content (extract first line)
UPDATE "public"."Notice"
SET "title" = SPLIT_PART("content", E'\n', 1)
WHERE "title" IS NULL;

-- Step 3: Update content to remove the title (keep only remaining lines)
UPDATE "public"."Notice"
SET "content" = SUBSTRING("content" FROM POSITION(E'\n' IN "content") + 1)
WHERE POSITION(E'\n' IN "content") > 0;

-- Step 4: For records without newline, keep content as is (single line becomes title, content becomes empty or same)
UPDATE "public"."Notice"
SET "content" = ''
WHERE POSITION(E'\n' IN "content") = 0 AND "content" = "title";

-- Step 5: Make title NOT NULL
ALTER TABLE "public"."Notice" ALTER COLUMN "title" SET NOT NULL;
