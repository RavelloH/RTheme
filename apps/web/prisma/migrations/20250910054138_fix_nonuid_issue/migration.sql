/*
  Warnings:

  - Added the required column `userUid` to the `PasswordReset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."PasswordReset" ADD COLUMN     "userUid" INTEGER NOT NULL;
