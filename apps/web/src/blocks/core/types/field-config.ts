/**
 * 字段配置类型定义
 * 用于配置驱动的表单渲染
 */

import type { SelectOption } from "@/ui/Select";

/**
 * 支持的字段类型
 */
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "toggle"
  | "array"
  | "image"
  | "imageArray";

/**
 * 字段条件配置
 */
export interface FieldCondition {
  /** AND 条件：所有条件都满足时显示 */
  and?: Array<{
    /** 字段路径 */
    field: string;
    /** 期望值 */
    value: unknown;
  }>;
  /** OR 条件：任一条件满足时显示（可选） */
  or?: Array<{
    /** 字段路径 */
    field: string;
    /** 期望值 */
    value: unknown;
  }>;
  /** NOT 条件：不满足条件时显示（可选） */
  not?: Array<{
    /** 字段路径 */
    field: string;
    /** 期望值 */
    value: unknown;
  }>;
}

/**
 * 基础字段配置接口
 */
export interface BaseFieldConfig {
  /** 字段标签 */
  label: string;
  /** 字段路径（支持嵌套，如 "footer.text"） */
  path: string;
  /** 字段类型 */
  type: FieldType;
  /** 帮助文本 */
  helperText?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 字段禁用状态 */
  disabled?: boolean;
  /** 显示条件（可选） */
  condition?: FieldCondition;
}

/**
 * 文本类型字段配置
 */
export interface TextFieldConfig extends BaseFieldConfig {
  type: "text" | "textarea" | "number" | "date";
  /** 默认值 */
  defaultValue?: string | number;
}

/**
 * 数组类型字段配置
 */
export interface ArrayFieldConfig extends BaseFieldConfig {
  type: "array";
  /** 数组项分隔符提示 */
  separatorHint?: string;
  /** 默认值 */
  defaultValue?: unknown[];
}

/**
 * 选择类型字段配置
 */
export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  /** 可选项 */
  options: SelectOption[];
  /** 占位符 */
  placeholder?: string;
  /** 默认值（对应 options 中的 value） */
  defaultValue?: string;
}

/**
 * 开关类型字段配置
 */
export interface ToggleFieldConfig extends BaseFieldConfig {
  type: "toggle";
  /** 默认值 */
  defaultValue?: boolean;
}

/**
 * 图片类型字段配置（单选）
 */
export interface ImageFieldConfig extends BaseFieldConfig {
  type: "image";
  /** 默认值（图片 URL，如 /p/abc123） */
  defaultValue?: string;
}

/**
 * 图片数组类型字段配置（多选）
 */
export interface ImageArrayFieldConfig extends BaseFieldConfig {
  type: "imageArray";
  /** 默认值（图片 URL 数组） */
  defaultValue?: string[];
  /** 最大选择数量 */
  maxCount?: number;
}

/**
 * 字段配置联合类型
 */
export type FieldConfig =
  | TextFieldConfig
  | ArrayFieldConfig
  | SelectFieldConfig
  | ToggleFieldConfig
  | ImageFieldConfig
  | ImageArrayFieldConfig;

/**
 * 区块表单配置
 */
export interface BlockFormConfig {
  /** 区块类型标识 */
  blockType: string;
  /** 区块显示名称 */
  displayName: string;
  /** 区块描述 */
  description?: string;
  /** 字段配置数组 */
  fields: FieldConfig[];
  /** 分组配置（可选，用于复杂布局） */
  groups?: FormGroup[];
  /** 区块操作负载 */
  actions?: {
    /** 需要的数据库操作数 */
    db: number;
    /** 需要的配置操作数 */
    config: number;
  };
  /** 作者信息 */
  author?: {
    /** 作者名称 */
    name: string;
    /** 作者链接 */
    url?: string;
  };
  /** 主题信息 */
  theme?: {
    /** 主题名称 */
    name: string;
    /** 主题链接 */
    url?: string;
  };
  /** 预览数据（用于预览时展示示例内容） */
  previewData?: Record<string, unknown>;
}

/**
 * 表单分组配置
 */
export interface FormGroup {
  /** 分组标题 */
  title: string;
  /** 分组描述 */
  description?: string;
  /** 包含的字段路径 */
  fields: string[];
}
