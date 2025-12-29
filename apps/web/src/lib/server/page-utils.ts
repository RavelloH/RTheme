import "server-only";

import type { SystemPageConfig } from "./page-cache";

/**
 * 从配置对象中获取指定 ID 的 block
 * @param config 系统页面配置对象
 * @param blockId block ID（数字）
 * @returns 匹配的 block 或 null
 */
export function getPageBlock(
  config: SystemPageConfig | null,
  blockId: number,
): unknown | null {
  if (!config?.blocks) {
    return null;
  }

  const block = config.blocks.find((block) => block.id === blockId);
  return block || null;
}

/**
 * 从配置对象中获取指定 ID 的 component
 * @param config 系统页面配置对象
 * @param componentId component ID（字符串）
 * @returns 匹配的 component 或 null
 */
export function getPageComponent(
  config: SystemPageConfig | null,
  componentId: string,
): unknown | null {
  if (!config?.components) {
    return null;
  }

  const component = config.components.find(
    (component) => component.id === componentId,
  );
  return component || null;
}

/**
 * 从配置对象中获取指定 block 的字段值
 * @param config 系统页面配置对象
 * @param blockId block ID（数字）
 * @param fieldPath 字段路径，例如 "title.value" 或 "content.value.top"
 * @param defaultValue 默认值
 * @returns 字段值或默认值
 */
export function getPageBlockValue<T = unknown>(
  config: SystemPageConfig | null,
  blockId: number,
  fieldPath: string,
  defaultValue?: T,
): T | null {
  const block = getPageBlock(config, blockId) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (!block) {
    return defaultValue ?? null;
  }

  try {
    // 解析字段路径，例如 "title.value" -> ["title", "value"]
    const pathParts = fieldPath.split(".");
    let currentValue: unknown = block.content; // 从 content 开始！

    for (const part of pathParts) {
      if (
        currentValue &&
        typeof currentValue === "object" &&
        part in currentValue
      ) {
        currentValue = (currentValue as Record<string, unknown>)[part];
      } else {
        return defaultValue ?? null;
      }
    }

    return currentValue as T;
  } catch (error) {
    console.error(`获取页面 block 字段值失败: ${fieldPath}`, error);
    return defaultValue ?? null;
  }
}

/**
 * 从配置对象中获取指定 component 的字段值
 * @param config 系统页面配置对象
 * @param componentId component ID（字符串）
 * @param fieldPath 字段路径，例如 "header" 或 "footer.link"
 * @param defaultValue 默认值
 * @returns 字段值或默认值
 */
export function getPageComponentValue<T = unknown>(
  config: SystemPageConfig | null,
  componentId: string,
  fieldPath: string,
  defaultValue?: T,
): T | null {
  const component = getPageComponent(config, componentId) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (!component) {
    return defaultValue ?? null;
  }

  try {
    // 解析字段路径，例如 "header" -> ["header"]
    const pathParts = fieldPath.split(".");
    let currentValue: unknown = component.value; // 从 value 开始！

    for (const part of pathParts) {
      if (
        currentValue &&
        typeof currentValue === "object" &&
        part in currentValue
      ) {
        currentValue = (currentValue as Record<string, unknown>)[part];
      } else {
        return defaultValue ?? null;
      }
    }

    return currentValue as T;
  } catch (error) {
    console.error(`获取页面 component 字段值失败: ${fieldPath}`, error);
    return defaultValue ?? null;
  }
}

/**
 * 检查指定 block 是否启用
 * @param config 系统页面配置对象
 * @param blockId block ID（数字）
 * @returns 是否启用
 */
export function isPageBlockEnabled(
  config: SystemPageConfig | null,
  blockId: number,
): boolean {
  const block = getPageBlock(config, blockId) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return block?.enabled ?? false;
}

/**
 * 获取配置对象的所有 block IDs
 * @param config 系统页面配置对象
 * @returns block ID 数组
 */
export function getPageBlockIds(config: SystemPageConfig | null): number[] {
  if (!config?.blocks) {
    return [];
  }

  return config.blocks.map((block) => block.id);
}

/**
 * 获取配置对象的所有 component IDs
 * @param config 系统页面配置对象
 * @returns component ID 数组
 */
export function getPageComponentIds(config: SystemPageConfig | null): string[] {
  if (!config?.components) {
    return [];
  }

  return config.components.map((component) => component.id);
}

/**
 * 页面配置构建器类 - 提供流畅的链式调用接口
 */
export class PageConfigBuilder {
  constructor(private config: SystemPageConfig | null) {}

  /**
   * 获取指定 ID 的 block
   */
  getBlock(blockId: number): unknown | null {
    return getPageBlock(this.config, blockId);
  }

  /**
   * 获取指定 ID 的 component
   */
  getComponent(componentId: string): unknown | null {
    return getPageComponent(this.config, componentId);
  }

  /**
   * 获取 block 的字段值
   * @param blockId block ID
   * @param fieldPath 字段路径，如 "footer.link"
   * @param defaultValue 默认值
   */
  getBlockValue<T = unknown>(
    blockId: number,
    fieldPath: string,
    defaultValue?: T,
  ): T | null {
    return getPageBlockValue(this.config, blockId, fieldPath, defaultValue);
  }

  /**
   * 获取 component 的字段值
   * @param componentId component ID
   * @param fieldPath 字段路径，如 "header" 或 "footer.link"
   * @param defaultValue 默认值
   */
  getComponentValue<T = unknown>(
    componentId: string,
    fieldPath: string,
    defaultValue?: T,
  ): T | null {
    return getPageComponentValue(
      this.config,
      componentId,
      fieldPath,
      defaultValue,
    );
  }

  /**
   * 获取所有 IDs
   */
  getIds(): { blocks: number[]; components: string[] } {
    return {
      blocks: getPageBlockIds(this.config),
      components: getPageComponentIds(this.config),
    };
  }

  /**
   * 检查配置是否有效
   */
  isValid(): boolean {
    return this.config !== null && typeof this.config === "object";
  }

  // === 便捷的别名方法 ===

  /**
   * getBlock 的别名
   */
  block = this.getBlock;

  /**
   * getComponent 的别名
   */
  component = this.getComponent;

  /**
   * getBlockValue 的别名
   */
  blockValue = this.getBlockValue;

  /**
   * getComponentValue 的别名
   */
  componentValue = this.getComponentValue;

  // === 便捷的获取方法 ===

  /**
   * 快速获取 block 的标题
   */
  getBlockTitle(blockId: number, defaultValue: string = ""): string {
    return (
      this.getBlockValue<string>(blockId, "title.value", defaultValue) ??
      defaultValue
    );
  }

  /**
   * 快速获取 block 的头部文本
   */
  getBlockHeader(blockId: number, defaultValue: string = ""): string {
    return (
      this.getBlockValue<string>(blockId, "header.value", defaultValue) ??
      defaultValue
    );
  }

  /**
   * 快速获取 block 的内容数组
   */
  getBlockContent(
    blockId: number,
    field: "top" | "bottom" = "top",
    defaultValue: string[] = [],
  ): string[] {
    return (
      this.getBlockValue<string[]>(
        blockId,
        `content.value.${field}`,
        defaultValue,
      ) ?? defaultValue
    );
  }

  /**
   * 快速获取 block 的底部链接
   */
  getBlockFooterLink(blockId: number, defaultValue: string = ""): string {
    return (
      this.getBlockValue<string>(blockId, "footer.value.link", defaultValue) ??
      defaultValue
    );
  }

  /**
   * 快速获取 block 的底部描述
   */
  getBlockFooterDesc(blockId: number, defaultValue: string = ""): string {
    return (
      this.getBlockValue<string>(
        blockId,
        "footer.value.description",
        defaultValue,
      ) ?? defaultValue
    );
  }

  /**
   * 快速获取 component 的头部
   */
  getComponentHeader(componentId: string, defaultValue: string = ""): string {
    return (
      this.getComponentValue<string>(componentId, "header", defaultValue) ??
      defaultValue
    );
  }

  /**
   * 快速获取 component 的内容
   */
  getComponentContent(componentId: string, defaultValue: string = ""): string {
    return (
      this.getComponentValue<string>(componentId, "content", defaultValue) ??
      defaultValue
    );
  }

  /**
   * 快速获取 component 的内容数组
   */
  getComponentContentArray(
    componentId: string,
    defaultValue: string[] = [],
  ): string[] {
    return (
      this.getComponentValue<string[]>(componentId, "content", defaultValue) ??
      defaultValue
    );
  }

  /**
   * 快速获取 component 的底部链接
   */
  getComponentFooterLink(
    componentId: string,
    defaultValue: string = "",
  ): string {
    return (
      this.getComponentValue<string>(
        componentId,
        "footer.link",
        defaultValue,
      ) ?? defaultValue
    );
  }

  /**
   * 快速获取 component 的底部描述
   */
  getComponentFooterDesc(
    componentId: string,
    defaultValue: string = "",
  ): string {
    return (
      this.getComponentValue<string>(
        componentId,
        "footer.description",
        defaultValue,
      ) ?? defaultValue
    );
  }

  // === 便捷的状态检查方法 ===

  /**
   * 检查指定 block 是否启用（更直观的命名）
   * @param blockId block ID
   * @returns 是否启用
   */
  isBlockEnabled(blockId: number): boolean {
    return isPageBlockEnabled(this.config, blockId);
  }

  /**
   * 检查指定 block 是否未启用
   * @param blockId block ID
   * @returns 是否未启用
   */
  isBlockDisabled(blockId: number): boolean {
    return !this.isBlockEnabled(blockId);
  }

  /**
   * 获取指定 block 的启用状态（返回布尔值或 null）
   * @param blockId block ID
   * @returns 启用状态，如果 block 不存在则返回 null
   */
  getBlockStatus(blockId: number): boolean | null {
    const block = getPageBlock(this.config, blockId) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return block ? block.enabled : null;
  }

  /**
   * 获取所有启用的 blocks
   * @returns 启用的 block 对象数组
   */
  getEnabledBlocks(): unknown[] {
    if (!this.config?.blocks) {
      return [];
    }

    return this.config.blocks.filter(
      (block: unknown) => (block as { enabled: boolean }).enabled,
    );
  }

  /**
   * 获取所有未启用的 blocks
   * @returns 未启用的 block 对象数组
   */
  getDisabledBlocks(): unknown[] {
    if (!this.config?.blocks) {
      return [];
    }

    return this.config.blocks.filter(
      (block: unknown) => !(block as { enabled: boolean }).enabled,
    );
  }

  /**
   * 获取启用和未启用的 blocks 统计
   * @returns { enabled: number, disabled: number, total: number }
   */
  getBlocksStats(): { enabled: number; disabled: number; total: number } {
    if (!this.config?.blocks) {
      return { enabled: 0, disabled: 0, total: 0 };
    }

    const enabled = this.config.blocks.filter(
      (block: unknown) => (block as { enabled: boolean }).enabled,
    ).length;
    const disabled = this.config.blocks.length - enabled;

    return { enabled, disabled, total: this.config.blocks.length };
  }
}

/**
 * 创建配置构建器实例
 * @param config 系统页面配置对象
 * @returns 配置构建器实例
 */
export function createPageConfigBuilder(
  config: SystemPageConfig | null,
): PageConfigBuilder {
  return new PageConfigBuilder(config);
}

/**
 * @deprecated 使用 createPageConfigBuilder 替代
 */
export function createPageConfigHelper(
  config: SystemPageConfig | null,
): PageConfigBuilder {
  return new PageConfigBuilder(config);
}

/**
 * @deprecated 使用 PageConfigBuilder 替代
 */
export class PageConfigHelper extends PageConfigBuilder {}
