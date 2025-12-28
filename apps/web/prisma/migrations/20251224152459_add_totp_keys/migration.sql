-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpBackupCodes" JSONB,
ADD COLUMN     "totpSecret" VARCHAR(255);
