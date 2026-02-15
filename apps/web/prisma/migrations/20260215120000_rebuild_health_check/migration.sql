-- DropTable
DROP TABLE IF EXISTS "HealthCheck";

-- DropEnum
DROP TYPE IF EXISTS "HealthStatus";
DROP TYPE IF EXISTS "HealthCheckTriggerType";

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('OK', 'WARNING', 'ERROR');
CREATE TYPE "HealthCheckTriggerType" AS ENUM ('MANUAL', 'AUTO', 'CRON');

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "triggerType" "HealthCheckTriggerType" NOT NULL,
    "overallStatus" "HealthStatus" NOT NULL,
    "okCount" INTEGER NOT NULL,
    "warningCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthCheck_startedAt_idx" ON "HealthCheck"("startedAt" DESC);
CREATE INDEX "HealthCheck_overallStatus_startedAt_idx" ON "HealthCheck"("overallStatus", "startedAt" DESC);
CREATE INDEX "HealthCheck_triggerType_startedAt_idx" ON "HealthCheck"("triggerType", "startedAt" DESC);
