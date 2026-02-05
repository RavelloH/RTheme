/**
 * 编辑器可用模式
 */
export type EditorMode = "visual" | "markdown" | "mdx";

/**
 * 编辑器配置类型
 */
export interface EditorConfig {
  // 基本信息
  entityType: "post" | "project"; // 实体类型
  storageKey: string; // 存储键前缀

  // 可用的编辑器模式
  availableModes: EditorMode[]; // 例如: ["visual", "markdown"] 或 ["visual", "markdown", "mdx"]
  defaultMode?: EditorMode; // 默认模式

  // 详细信息字段配置
  fieldConfig: FieldConfig;

  // 额外功能按钮
  extraActions?: ExtraAction[];

  // 保存/发布配置
  saveConfig: SaveConfig;
}

/**
 * 字段配置 - 控制详细信息对话框显示哪些字段
 */
export interface FieldConfig {
  // 基本信息字段
  basic: {
    title: boolean;
    slug: boolean;
    excerpt?: boolean; // Post 特有
    description?: boolean; // Project 特有
  };

  // 分类与标签
  taxonomy: {
    category: boolean;
    tags: boolean;
  };

  // 发布设置
  publish: {
    status: boolean;
    isPinned?: boolean; // Post 特有
    allowComments?: boolean; // Post 特有
  };

  // SEO 设置
  seo?: {
    metaDescription: boolean; // Post 特有
    metaKeywords: boolean; // Post 特有
    robotsIndex: boolean; // Post 特有
  };

  // 项目特有字段
  project?: {
    demoUrl: boolean;
    repoUrl: boolean;
    techStack: boolean;
    startedAt: boolean;
    githubSettings: boolean;
    license: boolean;
  };

  // 特色图片
  featuredImage: {
    enabled: boolean;
    multiple?: boolean; // Project 支持多张
  };
}

/**
 * 额外功能按钮
 */
export interface ExtraAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "ghost" | "danger" | "secondary" | "outline";
  onClick: () => void | Promise<void>;
  loading?: boolean;
  loadingText?: string;
  showWhen?: (formData: Record<string, unknown>) => boolean; // 条件显示
}

/**
 * 保存配置
 */
export interface SaveConfig {
  // 使用 any 因为 Server Action 有复杂的重载签名
  // 实际类型会在运行时由具体 action 函数验证
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAction: (...args: any[]) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAction: (...args: any[]) => Promise<unknown>;
  successRedirectPath: string;
  commitMessageEnabled?: boolean; // 是否启用提交信息输入
}

/**
 * 初始数据类型
 */
export interface EditorInitialData {
  // 共享字段
  title?: string;
  slug?: string;
  status?: string;
  categories?: string[];
  tags?: string[];
  featuredImage?: string;

  // Post 特有字段
  excerpt?: string;
  isPinned?: boolean;
  allowComments?: boolean;
  robotsIndex?: boolean;
  metaDescription?: string;
  metaKeywords?: string;
  postMode?: "MARKDOWN" | "MDX";

  // Project 特有字段
  description?: string;
  demoUrl?: string;
  repoUrl?: string;
  techStack?: string[];
  startedAt?: string;
  repoPath?: string;
  license?: string;
  enableGithubSync?: boolean;
  enableConentSync?: boolean;
  featuredImages?: string[];
}

// ============================================================================
// 新架构类型定义 - 用于 EditorCore 纯 UI 组件
// ============================================================================

/**
 * 对话框字段类型
 */
export interface DialogField {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "checkbox"
    | "category"
    | "tags"
    | "media"
    | "date";
  required?: boolean;
  options?: { value: string; label: string }[];
  helperText?: string;
  multiple?: boolean;
  placeholder?: string;
  rows?: number;
}

/**
 * 对话框操作按钮
 */
export interface DialogAction {
  id: string;
  label: string;
  variant: "primary" | "ghost" | "danger" | "secondary" | "outline";
  onClick: (data: Record<string, unknown>) => void | Promise<void>;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  disabledText?: string;
}

/**
 * 对话框配置
 */
export interface DialogConfig {
  id: string;
  type: "details" | "confirm" | "custom";
  title: string;
  size?: "sm" | "md" | "lg" | "xl";

  // 字段配置（用于详情对话框）
  fieldGroups?: DialogFieldGroup[];

  // 自定义内容渲染函数（用于自定义对话框）
  renderContent?: (props: {
    formData: Record<string, unknown>;
    onFieldChange: (field: string, value: unknown) => void;
    onClose: () => void;
  }) => React.ReactNode;

  // 对话框操作按钮
  actions?: DialogAction[];

  // 对话框是否显示
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * 对话框字段分组
 */
export interface DialogFieldGroup {
  title?: string;
  fields: DialogField[];
}

/**
 * 状态栏操作按钮配置
 */
export interface StatusBarActionConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant: "primary" | "ghost" | "danger" | "secondary" | "outline";
  onClick: () => void | Promise<void>;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  disabledText?: string;
  showWhen?: (formData: Record<string, unknown>) => boolean;
}

/**
 * 工具栏按钮配置
 */
export interface ToolbarButtonConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip?: string;
  divider?: boolean; // 是否在按钮前添加分隔线
}

/**
 * EditorCore Props - 纯 UI 编辑器组件的属性
 */
export interface EditorCoreProps {
  // 基础配置
  content: string;
  storageKey: string;
  availableModes?: EditorMode[];
  defaultMode?: EditorMode;

  // 对话框配置
  dialogs?: DialogConfig[];

  // 状态栏额外操作按钮
  statusBarActions?: StatusBarActionConfig[];

  // 事件回调
  onChange?: (content: string) => void;
  onSave?: (formData: Record<string, unknown>) => void | Promise<void>;
  onPublish?: (formData: Record<string, unknown>) => void | Promise<void>;
  onModeChange?: (mode: EditorMode) => void;
  onExtraAction?: (
    actionId: string,
    formData: Record<string, unknown>,
  ) => void | Promise<void>;
}
