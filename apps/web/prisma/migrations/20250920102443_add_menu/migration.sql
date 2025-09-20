-- CreateEnum
CREATE TYPE "public"."MenuCategory" AS ENUM ('MAIN', 'COMMON', 'OUTSITE');

-- CreateEnum
CREATE TYPE "public"."MenuStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "public"."Page" ADD COLUMN     "config" JSONB,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userUid" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Menu" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(100),
    "link" VARCHAR(255),
    "slug" VARCHAR(100),
    "status" "public"."MenuStatus" NOT NULL DEFAULT 'ACTIVE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "category" "public"."MenuCategory" NOT NULL DEFAULT 'COMMON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pageId" TEXT,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Menu_name_idx" ON "public"."Menu"("name");

-- CreateIndex
CREATE INDEX "Menu_createdAt_idx" ON "public"."Menu"("createdAt");

-- CreateIndex
CREATE INDEX "Menu_pageId_idx" ON "public"."Menu"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_slug_key" ON "public"."Menu"("slug");

-- AddForeignKey
ALTER TABLE "public"."Menu" ADD CONSTRAINT "Menu_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
