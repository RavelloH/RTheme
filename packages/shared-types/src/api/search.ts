import { z } from "zod";

// 重新定义 PostStatus 类型，与 Prisma schema 保持一致
export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

// ==================== 测试分词 ====================

export const TestTokenizeSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  text: z
    .string()
    .min(1, "文本内容不能为空")
    .max(10000, "文本长度不能超过 10000 字符"),
});

export type TestTokenize = z.infer<typeof TestTokenizeSchema>;

export interface TestTokenizeResult {
  text: string;
  tokens: string[];
  count: number;
  duration: number; // 分词耗时（微秒）
}

// ==================== 添加自定义词典 ====================

export const AddCustomWordSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  word: z.string().min(1, "词汇不能为空").max(50, "词汇长度不能超过 50 字符"),
});

export type AddCustomWord = z.infer<typeof AddCustomWordSchema>;

export interface AddCustomWordResult {
  word: string;
  added: boolean;
  affectedPosts?: Array<{ slug: string; title: string }>; // 受影响的文章列表
}

// ==================== 获取自定义词典列表 ====================

export const GetCustomWordsSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
});

export type GetCustomWords = z.infer<typeof GetCustomWordsSchema>;

export interface CustomWordItem {
  id: number;
  word: string;
  createdAt: string;
}

// ==================== 删除自定义词典 ====================

export const DeleteCustomWordSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  id: z.number().int().positive(),
});

export type DeleteCustomWord = z.infer<typeof DeleteCustomWordSchema>;

export interface DeleteCustomWordResult {
  id: number;
  word: string;
  deleted: boolean;
  affectedPosts?: Array<{ slug: string; title: string }>; // 受影响的文章列表
}

// ==================== 创建文章索引 ====================

export const IndexPostsSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  slugs: z.array(z.string()).optional(),
});

export type IndexPosts = z.infer<typeof IndexPostsSchema>;

export interface IndexPostsResult {
  total: number;
  indexed: number;
  failed: number;
  errors?: Array<{ slug: string; error: string }>;
}

// ==================== 删除文章索引 ====================

export const DeleteIndexSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  slugs: z.array(z.string()).min(1, "至少需要指定一篇文章"),
});

export type DeleteIndex = z.infer<typeof DeleteIndexSchema>;

export interface DeleteIndexResult {
  total: number;
  deleted: number;
  failed: number;
  errors?: Array<{ slug: string; error: string }>;
}

// ==================== 获取索引状态 ====================

export const GetIndexStatusSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
  sortBy: z.enum(["id", "slug", "updatedAt", "tokenizedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  status: z.enum(["outdated", "up-to-date", "never-indexed"]).optional(),
});

export type GetIndexStatus = z.infer<typeof GetIndexStatusSchema>;

export interface IndexStatusItem {
  id: number;
  slug: string;
  title: string;
  updatedAt: string;
  tokenizedAt: string | null;
  status: "outdated" | "up-to-date" | "never-indexed";
  tokenSize?: number; // 搜索向量占据的存储空间（字节）
  tokenCount?: number; // 搜索向量中的词元总数
}

// ==================== 获取文章分词详情 ====================

export const GetPostTokenDetailsSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  slug: z.string().min(1, "文章 slug 不能为空"),
});

export type GetPostTokenDetails = z.infer<typeof GetPostTokenDetailsSchema>;

export interface PostTokenDetails {
  slug: string;
  title: string;
  titleTokens: string[]; // 从标题搜索向量中提取的词元列表（按位置排序）
  contentTokens: string[]; // 从内容搜索向量中提取的词元列表（按位置排序）
  titleTokenCount: number; // 标题词元数量
  contentTokenCount: number; // 内容词元数量
  totalTokenCount: number; // 总词元数量
  tokenSize: number; // 搜索向量占据的存储空间（字节）
  tokenizedAt: string | null; // 索引建立时间
  wordCloud: Array<{ word: string; count: number }>; // 词云数据（按出现次数排序，去除单字符）
}

// ==================== 搜索文章 ====================

export const SearchPostsSchema = z.object({
  query: z
    .string()
    .min(1, "搜索关键词不能为空")
    .max(200, "搜索关键词长度不能超过 200 字符"),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(50).optional().default(10),
  searchIn: z.enum(["title", "content", "both"]).optional().default("both"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sessionId: z.string().optional(), // 搜索会话 ID（同一搜索页面的多次搜索使用同一个 ID）
  visitorId: z.string().optional(), // 访客 ID（用于长期追踪用户搜索行为）
});

export type SearchPosts = z.infer<typeof SearchPostsSchema>;

export interface SearchPostsResultItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    uid: number;
    username: string;
    nickname: string | null;
  };
  rank: number; // 搜索相关性排名
  isPinned: boolean;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  coverData?: {
    url: string;
    width: number | null;
    height: number | null;
    blur: string | null;
  };
  titleHighlight: string; // 标题中的匹配高亮
  excerptHighlight: string | null; // 摘要中的匹配高亮（从 contentSearchVector 提取的关键词）
}

export interface SearchPostsResult {
  posts: SearchPostsResultItem[];
  total: number;
  query: string;
  tokensUsed: string[]; // 实际使用的搜索词
}

// ==================== 获取搜索索引统计 ====================

export const GetSearchIndexStatsSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  force: z.boolean().optional(),
});

export type GetSearchIndexStats = z.infer<typeof GetSearchIndexStatsSchema>;

export interface SearchIndexStatsResult {
  totalPosts: number; // 总文章数
  indexedPosts: number; // 已索引文章数
  upToDatePosts: number; // 索引最新的文章数
  outdatedPosts: number; // 索引过期的文章数
  neverIndexedPosts: number; // 从未索引的文章数
  totalTokenCount: number; // 总词元数
  totalTokenSize: number; // 总索引体积（字节）
  avgTokenCount: number; // 平均词元数
  avgTokenSize: number; // 平均索引体积（字节）
  recentIndexed7Days: number; // 近7天新建索引数
  recentIndexed30Days: number; // 近30天新建索引数
  customWordCount: number; // 自定义词典词汇数
  indexRate: number; // 索引率（百分比）
  upToDateRate: number; // 最新率（百分比）
  topWords: Array<{ word: string; count: number }>; // 全站高频词（Top 100）
  cached: boolean; // 是否来自缓存
  generatedAt: string; // 生成时间
}

// ==================== 获取搜索日志统计 ====================

export const GetSearchLogStatsSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  days: z.number().int().min(1).max(365).optional().default(30), // 统计天数
  force: z.boolean().optional(),
});

export type GetSearchLogStats = z.infer<typeof GetSearchLogStatsSchema>;

export interface SearchLogDailyTrend {
  date: string; // YYYY-MM-DD
  searchCount: number; // 搜索次数
  uniqueVisitors: number; // 搜索人数（唯一 visitorId 数）
  zeroResultCount: number; // 无结果搜索次数
  avgDuration: number; // 平均耗时（毫秒）
}

export interface SearchLogStatsResult {
  totalSearches: number; // 总搜索次数
  uniqueQueries: number; // 唯一搜索词数
  avgResultCount: number; // 平均结果数
  zeroResultRate: number; // 无结果率（百分比）
  avgDuration: number; // 平均耗时（毫秒）
  dailyTrend: SearchLogDailyTrend[]; // 每日趋势
  topQueries: Array<{ query: string; count: number }>; // 热门搜索词 Top 50（原始搜索词）
  topTokens: Array<{ token: string; count: number }>; // 热门分词 Top 50（分词结果）
  topZeroResultQueries: Array<{ query: string; count: number }>; // 无结果热门词 Top 20
  cached?: boolean; // 是否来自缓存
  generatedAt: string; // 生成时间
}

// ==================== 获取搜索日志列表 ====================

export const GetSearchLogsSchema = z.object({
  access_token: z.string().min(1, "access_token 不能为空"),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(25),
  sortBy: z
    .enum(["id", "createdAt", "query", "resultCount", "durationMs"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  query: z.string().optional(), // 按搜索词过滤
  minResultCount: z.number().int().min(0).optional(), // 最小结果数
  maxResultCount: z.number().int().min(0).optional(), // 最大结果数
  hasZeroResults: z.boolean().optional(), // 是否无结果
  dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
  dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
});

export type GetSearchLogs = z.infer<typeof GetSearchLogsSchema>;

export interface SearchLogItem {
  id: number;
  query: string;
  tokens: string[];
  resultCount: number;
  durationMs: number | null;
  createdAt: string;
  ip: string | null;
  sessionId: string | null;
  visitorId: string | null;
  location: {
    country: string | null;
    region: string | null;
    city: string | null;
  } | null;
}
