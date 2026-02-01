import { cookies } from "next/headers";

import ForbiddenPage from "@/app/forbidden";
import UnauthorizedPage from "@/app/unauthorized";
import type { AccessTokenPayload } from "@/lib/server/jwt";
import { jwtTokenVerify } from "@/lib/server/jwt";

const allowedRoles = ["ADMIN", "EDITOR", "AUTHOR"];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!token) {
    return <UnauthorizedPage redirect="/admin" />;
  }

  const user = jwtTokenVerify<AccessTokenPayload>(token);

  if (!user) {
    return <UnauthorizedPage redirect="/admin" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <ForbiddenPage role={user.role} allowRoles={allowedRoles} />;
  }

  return <>{children}</>;
}
