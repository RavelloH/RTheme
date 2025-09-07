-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."PageStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."CommentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM');

-- CreateTable
CREATE TABLE "public"."User" (
    "uid" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyCode" VARCHAR(30),
    "emailNotice" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "nickname" VARCHAR(50),
    "website" VARCHAR(255),
    "bio" VARCHAR(255),
    "password" TEXT,
    "avatar" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUseAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userUid" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "userUid" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" VARCHAR(500),
    "featuredImage" VARCHAR(255),
    "status" "public"."PostStatus" NOT NULL DEFAULT 'DRAFT',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "userUid" INTEGER NOT NULL,
    "metaTitle" VARCHAR(60),
    "metaDescription" VARCHAR(160),
    "metaKeywords" VARCHAR(255),
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "name" TEXT NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "name" TEXT NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'PENDING',
    "postId" TEXT NOT NULL,
    "userUid" INTEGER,
    "authorName" VARCHAR(50),
    "authorEmail" VARCHAR(255),
    "parentId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "postId" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "altText" VARCHAR(255),
    "url" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageProviderId" TEXT NOT NULL,
    "userUid" INTEGER NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StorageProvider" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "maxFileSize" INTEGER NOT NULL DEFAULT 10485760,
    "allowedTypes" VARCHAR(50)[],
    "pathTemplate" TEXT NOT NULL DEFAULT '/{year}/{month}/{filename}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" VARCHAR(500),
    "status" "public"."PageStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metaTitle" VARCHAR(60),
    "metaDescription" VARCHAR(160),
    "metaKeywords" VARCHAR(255),
    "userUid" INTEGER NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(255),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Notice" (
    "id" TEXT NOT NULL,
    "userUid" INTEGER NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(10000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromUserUid" INTEGER NOT NULL,
    "toUserUid" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ViewCountCache" (
    "path" VARCHAR(500) NOT NULL,
    "cachedCount" INTEGER NOT NULL DEFAULT 0,
    "lastArchived" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewCountCache_pkey" PRIMARY KEY ("path")
);

-- CreateTable
CREATE TABLE "public"."PageView" (
    "id" TEXT NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(1000),
    "referer" VARCHAR(500),
    "browser" VARCHAR(50),
    "browserVersion" VARCHAR(20),
    "os" VARCHAR(50),
    "osVersion" VARCHAR(20),
    "deviceType" VARCHAR(20),
    "screenSize" VARCHAR(20),
    "language" VARCHAR(10),
    "timezone" VARCHAR(50),
    "visitorId" VARCHAR(100) NOT NULL,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageViewArchive" (
    "id" TEXT NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "date" DATE NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "ipStats" JSONB,
    "refererStats" JSONB,
    "deviceStats" JSONB,
    "browserStats" JSONB,
    "osStats" JSONB,
    "screenStats" JSONB,
    "languageStats" JSONB,
    "timezoneStats" JSONB,
    "userAgentStats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageViewArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "resourceId" VARCHAR(100) NOT NULL,
    "userUid" INTEGER,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(1000),
    "oldData" JSONB,
    "newData" JSONB,
    "changes" JSONB,
    "description" VARCHAR(500),
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RateLimitRecord" (
    "id" TEXT NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PostToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_CategoryToPost" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToPost_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "User_lastUseAt_idx" ON "public"."User"("lastUseAt");

-- CreateIndex
CREATE INDEX "Account_userUid_idx" ON "public"."Account"("userUid");

-- CreateIndex
CREATE INDEX "Account_provider_idx" ON "public"."Account"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "RefreshToken_userUid_idx" ON "public"."RefreshToken"("userUid");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "public"."RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_slug_idx" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "public"."Post"("status");

-- CreateIndex
CREATE INDEX "Post_userUid_idx" ON "public"."Post"("userUid");

-- CreateIndex
CREATE INDEX "Post_isPinned_idx" ON "public"."Post"("isPinned");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "public"."Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_updatedAt_idx" ON "public"."Post"("updatedAt");

-- CreateIndex
CREATE INDEX "Post_status_createdAt_idx" ON "public"."Post"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "public"."Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_userUid_idx" ON "public"."Comment"("userUid");

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "public"."Comment"("status");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "public"."Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "public"."Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_status_idx" ON "public"."Comment"("postId", "status");

-- CreateIndex
CREATE INDEX "Comment_userUid_status_idx" ON "public"."Comment"("userUid", "status");

-- CreateIndex
CREATE INDEX "Comment_status_createdAt_idx" ON "public"."Comment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Media_userUid_idx" ON "public"."Media"("userUid");

-- CreateIndex
CREATE INDEX "Media_mimeType_idx" ON "public"."Media"("mimeType");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "public"."Media"("createdAt");

-- CreateIndex
CREATE INDEX "Media_filename_idx" ON "public"."Media"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "Media_hash_key" ON "public"."Media"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "StorageProvider_name_key" ON "public"."StorageProvider"("name");

-- CreateIndex
CREATE INDEX "StorageProvider_isActive_idx" ON "public"."StorageProvider"("isActive");

-- CreateIndex
CREATE INDEX "StorageProvider_isDefault_idx" ON "public"."StorageProvider"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "public"."Page"("slug");

-- CreateIndex
CREATE INDEX "Page_slug_idx" ON "public"."Page"("slug");

-- CreateIndex
CREATE INDEX "Page_status_idx" ON "public"."Page"("status");

-- CreateIndex
CREATE INDEX "Page_userUid_idx" ON "public"."Page"("userUid");

-- CreateIndex
CREATE INDEX "Page_createdAt_idx" ON "public"."Page"("createdAt");

-- CreateIndex
CREATE INDEX "Config_updatedAt_idx" ON "public"."Config"("updatedAt");

-- CreateIndex
CREATE INDEX "Notice_userUid_isRead_idx" ON "public"."Notice"("userUid", "isRead");

-- CreateIndex
CREATE INDEX "Message_fromUserUid_idx" ON "public"."Message"("fromUserUid");

-- CreateIndex
CREATE INDEX "Message_toUserUid_idx" ON "public"."Message"("toUserUid");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "public"."Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_fromUserUid_toUserUid_idx" ON "public"."Message"("fromUserUid", "toUserUid");

-- CreateIndex
CREATE INDEX "ViewCountCache_lastUpdated_idx" ON "public"."ViewCountCache"("lastUpdated");

-- CreateIndex
CREATE INDEX "ViewCountCache_lastArchived_idx" ON "public"."ViewCountCache"("lastArchived");

-- CreateIndex
CREATE INDEX "ViewCountCache_cachedCount_idx" ON "public"."ViewCountCache"("cachedCount");

-- CreateIndex
CREATE INDEX "PageView_path_timestamp_idx" ON "public"."PageView"("path", "timestamp");

-- CreateIndex
CREATE INDEX "PageView_timestamp_idx" ON "public"."PageView"("timestamp");

-- CreateIndex
CREATE INDEX "PageView_visitorId_idx" ON "public"."PageView"("visitorId");

-- CreateIndex
CREATE INDEX "PageViewArchive_path_idx" ON "public"."PageViewArchive"("path");

-- CreateIndex
CREATE INDEX "PageViewArchive_date_idx" ON "public"."PageViewArchive"("date");

-- CreateIndex
CREATE INDEX "PageViewArchive_path_date_idx" ON "public"."PageViewArchive"("path", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PageViewArchive_path_date_key" ON "public"."PageViewArchive"("path", "date");

-- CreateIndex
CREATE INDEX "AuditLog_userUid_idx" ON "public"."AuditLog"("userUid");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "public"."AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_idx" ON "public"."AuditLog"("resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_action_resource_idx" ON "public"."AuditLog"("action", "resource");

-- CreateIndex
CREATE INDEX "AuditLog_userUid_timestamp_idx" ON "public"."AuditLog"("userUid", "timestamp");

-- CreateIndex
CREATE INDEX "RateLimitRecord_ipAddress_idx" ON "public"."RateLimitRecord"("ipAddress");

-- CreateIndex
CREATE INDEX "RateLimitRecord_timestamp_idx" ON "public"."RateLimitRecord"("timestamp");

-- CreateIndex
CREATE INDEX "RateLimitRecord_ipAddress_timestamp_idx" ON "public"."RateLimitRecord"("ipAddress", "timestamp");

-- CreateIndex
CREATE INDEX "RateLimitRecord_createdAt_idx" ON "public"."RateLimitRecord"("createdAt");

-- CreateIndex
CREATE INDEX "_PostToTag_B_index" ON "public"."_PostToTag"("B");

-- CreateIndex
CREATE INDEX "_CategoryToPost_B_index" ON "public"."_CategoryToPost"("B");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_storageProviderId_fkey" FOREIGN KEY ("storageProviderId") REFERENCES "public"."StorageProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notice" ADD CONSTRAINT "Notice_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_fromUserUid_fkey" FOREIGN KEY ("fromUserUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_toUserUid_fkey" FOREIGN KEY ("toUserUid") REFERENCES "public"."User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "public"."User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CategoryToPost" ADD CONSTRAINT "_CategoryToPost_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Category"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CategoryToPost" ADD CONSTRAINT "_CategoryToPost_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
