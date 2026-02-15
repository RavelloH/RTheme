-- CreateEnum
CREATE TYPE "MailSubscriptionStatus" AS ENUM ('PENDING_VERIFY', 'ACTIVE', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "MailSubscription" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "userUid" INTEGER,
    "status" "MailSubscriptionStatus" NOT NULL DEFAULT 'PENDING_VERIFY',
    "verifyTokenHash" VARCHAR(128),
    "verifyTokenExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "unsubscribeVersion" INTEGER NOT NULL DEFAULT 1,
    "unsubscribedAt" TIMESTAMP(3),
    "lastSentPostId" INTEGER,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailSubscription_email_key" ON "MailSubscription"("email");

-- CreateIndex
CREATE INDEX "MailSubscription_status_idx" ON "MailSubscription"("status");

-- CreateIndex
CREATE INDEX "MailSubscription_status_lastSentPostId_idx" ON "MailSubscription"("status", "lastSentPostId");

-- CreateIndex
CREATE INDEX "MailSubscription_userUid_idx" ON "MailSubscription"("userUid");

-- CreateIndex
CREATE INDEX "MailSubscription_verifyTokenExpiresAt_idx" ON "MailSubscription"("verifyTokenExpiresAt");

-- AddForeignKey
ALTER TABLE "MailSubscription" ADD CONSTRAINT "MailSubscription_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
