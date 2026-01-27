import { cookies } from "next/headers";
import UnauthorizedPage from "@/app/unauthorized";
import { jwtTokenVerify } from "@/lib/server/jwt";
import ForbiddenPage from "@/app/forbidden";
import type { AccessTokenPayload } from "@/lib/server/jwt";

const allowedRoles = ["ADMIN"];

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!token) {
    return <UnauthorizedPage />;
  }

  try {
    const decoded = jwtTokenVerify(token);
    const userRole = (decoded as AccessTokenPayload).role;

    if (!allowedRoles.includes(userRole)) {
      return <ForbiddenPage role={userRole} allowRoles={allowedRoles} />;
    }
  } catch (error) {
    console.error("Token verification failed:", error);
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
}
