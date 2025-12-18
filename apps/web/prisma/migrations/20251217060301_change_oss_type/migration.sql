/*
  Warnings:

  - The values [APPLE] on the enum `AccountProvider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountProvider_new" AS ENUM ('GOOGLE', 'GITHUB', 'MICROSOFT');
ALTER TABLE "Account" ALTER COLUMN "provider" TYPE "AccountProvider_new" USING ("provider"::text::"AccountProvider_new");
ALTER TYPE "AccountProvider" RENAME TO "AccountProvider_old";
ALTER TYPE "AccountProvider_new" RENAME TO "AccountProvider";
DROP TYPE "public"."AccountProvider_old";
COMMIT;
