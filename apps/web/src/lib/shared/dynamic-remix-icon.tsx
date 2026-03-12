import type { ComponentType } from "react";

/**
 * 将 kebab-case 图标名称转换为 RemixIcon 组件名称
 * e.g., "arrow-right-up-box-fill" → "RiArrowRightUpBoxFill"
 */
function convertToComponentName(name: string): string {
  const parts = name.split("-");
  const converted = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `Ri${converted}`;
}

/**
 * 通过 kebab-case 名称动态解析 RemixIcon 组件。
 * 使用动态 import() 以避免在编译时静态导入全部 3,227 个图标，
 * 防止 Turbopack 在处理大量导出时卡住构建。
 */
export async function resolveRemixIcon(
  kebabName: string,
): Promise<ComponentType<{ size?: string; className?: string }> | null> {
  const componentName = convertToComponentName(kebabName);
  const allIcons = (await import("@remixicon/react")) as unknown as Record<
    string,
    ComponentType<{ size?: string; className?: string }>
  >;
  return allIcons[componentName] || null;
}
