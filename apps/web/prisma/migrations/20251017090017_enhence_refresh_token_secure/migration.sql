-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "ipAddress" VARCHAR(45),
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" VARCHAR(1000);
