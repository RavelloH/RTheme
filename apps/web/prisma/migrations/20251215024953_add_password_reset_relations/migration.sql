-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
