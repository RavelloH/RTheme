-- CreateEnum
CREATE TYPE "CloudTriggerStatus" AS ENUM ('RECEIVED', 'DONE', 'ERROR', 'REJECTED');

-- CreateTable
CREATE TABLE "CloudTriggerHistory" (
    "id" SERIAL NOT NULL,
    "deliveryId" VARCHAR(80) NOT NULL,
    "requestedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerType" "CronTriggerType" NOT NULL,
    "verifyOk" BOOLEAN NOT NULL,
    "verifySource" VARCHAR(16),
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "dedupHit" BOOLEAN NOT NULL DEFAULT false,
    "status" "CloudTriggerStatus" NOT NULL,
    "message" VARCHAR(500),
    "cronHistoryId" INTEGER,
    "telemetry" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudTriggerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CloudTriggerHistory_deliveryId_key" ON "CloudTriggerHistory"("deliveryId");

-- CreateIndex
CREATE INDEX "CloudTriggerHistory_receivedAt_idx" ON "CloudTriggerHistory"("receivedAt" DESC);

-- CreateIndex
CREATE INDEX "CloudTriggerHistory_status_receivedAt_idx" ON "CloudTriggerHistory"("status", "receivedAt" DESC);
