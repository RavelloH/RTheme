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
