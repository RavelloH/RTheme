/**
 * 虚拟存储提供商管理
 * 用于外部链接图片的存储提供商
 */

import prisma from "@/lib/server/prisma";

const VIRTUAL_STORAGE_NAME = "external-url";
const VIRTUAL_STORAGE_DISPLAY_NAME = "外部链接";

/**
 * 获取或创建虚拟存储提供商
 * 如果不存在则自动创建,存在则直接返回
 */
export async function getOrCreateVirtualStorage() {
  // 先尝试查找现有的虚拟存储提供商
  let virtualStorage = await prisma.storageProvider.findUnique({
    where: { name: VIRTUAL_STORAGE_NAME },
  });

  // 如果不存在,则创建
  if (!virtualStorage) {
    virtualStorage = await prisma.storageProvider.create({
      data: {
        name: VIRTUAL_STORAGE_NAME,
        type: "EXTERNAL_URL",
        displayName: VIRTUAL_STORAGE_DISPLAY_NAME,
        baseUrl: "", // 外部链接不需要 baseUrl
        isActive: true,
        isDefault: false,
        maxFileSize: 0, // 外部链接不限制大小
        pathTemplate: "", // 外部链接不需要路径模板
        config: {}, // 外部链接不需要额外配置
      },
    });
  }

  return virtualStorage;
}

/**
 * 检查是否为虚拟存储提供商
 */
export function isVirtualStorage(
  storageProvider: { name: string } | string,
): boolean {
  const name =
    typeof storageProvider === "string"
      ? storageProvider
      : storageProvider.name;
  return name === VIRTUAL_STORAGE_NAME;
}

/**
 * 获取虚拟存储提供商的名称
 */
export function getVirtualStorageName(): string {
  return VIRTUAL_STORAGE_NAME;
}
