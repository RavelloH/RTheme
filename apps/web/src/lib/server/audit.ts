import "server-only";
import prisma from "@/lib/server/prisma";

/**
 * 记录审计日志
 * 此函数仅供服务器端内部使用
 */
export async function logAuditEvent({
  user,
  details,
}: {
  user: {
    uid: string;
    ipAddress: string;
    userAgent: string;
  };
  details?: {
    action: string;
    resourceType: string;
    resourceId?: string;
    value: {
      old: string | number | boolean | object | null;
      new: string | number | boolean | object | null;
    };
    description?: string;
    metadata?: Record<string, string | number | boolean>;
  };
}) {
  return await prisma.auditLog.create({
    data: {
      action: details?.action || "UNKNOWN",
      resource: details?.resourceType || "UNKNOWN",
      resourceId: details?.resourceId || "",
      userUid: Number(user.uid),
      description: details?.description || "",
      oldData: details?.value.old ? JSON.stringify(details.value.old) : {},
      newData: details?.value.new ? JSON.stringify(details.value.new) : {},
      ipAddress: user.ipAddress,
      userAgent: user.userAgent,
    },
  });
}
