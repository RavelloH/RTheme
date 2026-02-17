-- CreateEnum
CREATE TYPE "CronTriggerType" AS ENUM ('MANUAL', 'CLOUD', 'AUTO');

-- CreateEnum
CREATE TYPE "CronRunStatus" AS ENUM ('OK', 'PARTIAL', 'ERROR');

-- CreateTable
CREATE TABLE "CronHistory" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "triggerType" "CronTriggerType" NOT NULL,
    "status" "CronRunStatus" NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "enabledCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronHistory_startedAt_idx" ON "CronHistory"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "CronHistory_status_startedAt_idx" ON "CronHistory"("status", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "CronHistory_triggerType_startedAt_idx" ON "CronHistory"("triggerType", "startedAt" DESC);
