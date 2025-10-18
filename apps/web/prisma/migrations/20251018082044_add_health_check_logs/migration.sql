-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL,
    "issues" JSONB,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);
