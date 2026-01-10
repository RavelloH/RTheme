import "server-only";
import prisma from "@/lib/server/prisma";
import { getClientIP, getClientUserAgent } from "@/lib/server/get-client-info";

/**
 * 比对两个对象，只返回有差异的字段
 */
function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): { old: Record<string, unknown>; new: Record<string, unknown> } {
  const diffOld: Record<string, unknown> = {};
  const diffNew: Record<string, unknown> = {};

  // 获取所有键的并集
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // 使用深度比较判断值是否相同
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffOld[key] = oldValue;
      diffNew[key] = newValue;
    }
  }

  return { old: diffOld, new: diffNew };
}

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
    ipAddress?: string;
    userAgent?: string;
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
  // 如果未提供 IP 地址或 User-Agent，自动获取
  const ipAddress = user.ipAddress || (await getClientIP());
  const userAgent = user.userAgent || (await getClientUserAgent());

  // 处理 value 字段：如果新旧值都是对象，进行自动比对
  let oldData: string | number | boolean | object | null =
    details?.value.old || null;
  let newData: string | number | boolean | object | null =
    details?.value.new || null;

  if (
    oldData &&
    newData &&
    typeof oldData === "object" &&
    typeof newData === "object" &&
    !Array.isArray(oldData) &&
    !Array.isArray(newData)
  ) {
    const diff = diffObjects(
      oldData as Record<string, unknown>,
      newData as Record<string, unknown>,
    );
    oldData = diff.old;
    newData = diff.new;
  }

  return await prisma.auditLog.create({
    data: {
      action: details?.action || "UNKNOWN",
      resource: details?.resourceType || "UNKNOWN",
      resourceId: details?.resourceId || "",
      userUid: Number(user.uid),
      description: details?.description || "",
      oldData: oldData ? JSON.stringify(oldData) : {},
      newData: newData ? JSON.stringify(newData) : {},
      ipAddress,
      userAgent,
      metadata: details?.metadata,
    },
  });
}
