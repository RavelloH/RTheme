/**
 * 文本分词库 - 基于 Moo 词法分析器与 @node-rs/jieba 中文分词
 *
 * 三层分词策略：
 * 1. 词法分析层：使用 Moo 按优先级识别代码结构、网络标识、特殊格式
 * 2. 语义裂变层：对英文复合词使用 kebabCase 进行智能拆分，同时保留原词
 * 3. 中文分词层：使用 @node-rs/jieba 搜索引擎模式进行中文分词
 */
import "server-only";

import { Jieba } from "@node-rs/jieba";
import { dict } from "@node-rs/jieba/dict";
import { createHash } from "crypto";
import { kebabCase } from "lodash-es";
import moo from "moo";
import { unstable_cache } from "next/cache";

import prisma from "@/lib/server/prisma";

// ========== Token 类型定义 ==========

/**
 * Token 类型枚举（类型安全）
 */
const TOKEN_TYPES = {
  FRAMEWORK_DIRECTIVE: "framework_directive",
  DECORATOR: "decorator",
  NPM_PACKAGE: "npm_package",
  NPM_PACKAGE_WITH_VERSION: "npm_package_with_version",
  PACKAGE_WITH_VERSION: "package_with_version",
  GENERIC_TYPE: "generic_type",
  EMAIL: "email",
  IP: "ip",
  IPV6: "ipv6",
  UUID: "uuid",
  URL: "url",
  VERSION: "version",
  VERSION_WITH_TAG: "version_with_tag",
  DATE: "date",
  TIME: "time",
  NUMBER_UNIT: "number_unit",
  DOTFILE: "dotfile",
  PATH: "path",
  OPERATOR: "operator",
  PARENTHESES: "parentheses",
  CLI_FLAG: "cli_flag",
  TAILWIND_ARBITRARY: "tailwind_arbitrary",
  TAILWIND_STATE: "tailwind_state",
  COMPOUND_WORD: "compound_word",
  TEXT: "text",
  WHITESPACE: "whitespace",
} as const;

type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

// ========== TokenizerManager 单例 ==========

/**
 * 分词器管理器单例类
 * 封装全局状态，提供线程安全的 jieba 实例管理
 */
class TokenizerManager {
  private static instance: TokenizerManager | null = null;
  private jieba: Jieba | null = null;
  private jiebaDict: Uint8Array;
  private loadedDictHash: string = "";
  private isInitialized: boolean = false;

  private constructor() {
    this.jiebaDict = dict;
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TokenizerManager {
    if (!TokenizerManager.instance) {
      TokenizerManager.instance = new TokenizerManager();
    }
    return TokenizerManager.instance;
  }

  /**
   * 计算词典哈希值
   */
  private hashDict(dict: string[]): string {
    return createHash("md5").update(dict.join("\n")).digest("hex");
  }

  /**
   * 加载自定义词典
   */
  private async loadCustomDictionary(
    customWords: string[],
    currentHash: string,
  ): Promise<void> {
    try {
      // 将自定义词汇格式化为 "词 词频" 格式
      const customDictLines = customWords.map((word) => `${word} 100`);

      // 合并基础词典和自定义词典
      const baseDict = new TextDecoder().decode(dict);
      const mergedDictText =
        customDictLines.length > 0
          ? `${baseDict}\n${customDictLines.join("\n")}`
          : baseDict;

      // 创建新的 Uint8Array 并重新初始化 jieba
      this.jiebaDict = new TextEncoder().encode(mergedDictText);
      this.jieba = Jieba.withDict(this.jiebaDict);
      this.loadedDictHash = currentHash;
      this.isInitialized = true;
    } catch (error) {
      console.error("[自定义词典] 加载失败:", error);
      // 降级：使用基础词典
      if (!this.jieba) {
        this.jieba = Jieba.withDict(dict);
        this.isInitialized = true;
      }
      throw error;
    }
  }

  /**
   * 获取 jieba 实例（延迟初始化 + 词典变更检测）
   */
  async getJieba(): Promise<Jieba> {
    // 获取最新的自定义词典
    const customWords = await getCustomDictionary();
    const currentHash = this.hashDict(customWords);

    // 检查词典是否变更（首次调用或词典更新）
    if (!this.isInitialized || currentHash !== this.loadedDictHash) {
      await this.loadCustomDictionary(customWords, currentHash);
    }

    // jieba 此时必然不为 null
    return this.jieba!;
  }

  /**
   * 手动重置词典（用于测试或强制刷新）
   */
  async resetDictionary(): Promise<void> {
    this.loadedDictHash = "";
    this.isInitialized = false;
    await this.getJieba(); // 重新加载
  }

  /**
   * 获取当前词典哈希值
   */
  getCurrentDictHash(): string {
    return this.loadedDictHash;
  }
}

// ========== 常量定义 ==========

/** 最大 token 长度 */
// UUID: 36 字符 (550e8400-e29b-41d4-a716-446655440000)
// IPv6: 最长 45 字符 (2001:0db8:85a3:0000:0000:8a2e:0370:7334)
const MAX_TOKEN_LENGTH = 64;

/** 停止词集合 */
const STOP_WORDS = new Set([
  // 中文虚词
  "的",
  "了",
  "在",
  "是",
  "我",
  "有",
  "和",
  "就",
  "人",
  "都",
  "一",
  "一个",
  "上",
  "也",
  "很",
  "到",
  "说",
  "要",
  "去",
  "你",
  "会",
  "着",
  "没有",
  "看",
  "好",
  "自己",
  "这",
  "那",
  "我们",
  "你们",
  "他们",
  "个",
  "只",
  "把",
  "被",
  "让",
  "给",
  "但",
  "却",
  "请",
  "它",
  "为",
  "所",
  "与",
  "或",
  "及",
  "如",
  // 英文虚词
  "a",
  "an",
  "the",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "is",
  "are",
  "was",
  "were",
  "am",
  "be",
  "been",
  "being",
  "that",
  "these",
  "those",
  "of",
  "about",
  "against",
  "between",
  "through",
  "during",
  "above",
  "below",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "once",
  "here",
  "there",
  "why",
  "how",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "nor",
  "own",
  "same",
  "so",
  "than",
  "too",
  "to",
  "very",
  "can",
  "will",
  "just",
  "should",
  "now",
  "do",
  "does",
  "did",
  "if",
  "else",
  "by",
  "on",
  "at",
  "in",
  "from",
  "with",
  "for",
  "into",
  "as",
  "or",
  "and",
]);

// ========== Moo 词法分析器配置 ==========

const lexer = moo.compile({
  // ============================================
  // 1. 强格式与网络标识 (绝对明确，优先级最高)
  // ============================================

  // IPv6 (极其复杂且特征明显，最先匹配)
  ipv6: {
    match:
      /(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4})|(?:[a-fA-F0-9]{1,4}(?::[a-fA-F0-9]{1,4})*::[a-fA-F0-9]{1,4}(?::[a-fA-F0-9]{1,4})*)|(?:::[a-fA-F0-9]{1,4}(?::[a-fA-F0-9]{1,4})*)|(?:[a-fA-F0-9]{1,4}(?::[a-fA-F0-9]{1,4})*::)|(?:::)/,
    value: (s) => s,
  },

  // 邮箱 & URL (包含大量标点，先处理以免被拆散)
  email: {
    match: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    value: (s) => s,
  },
  url: {
    match: /https?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]+/,
    value: (s) => s,
  },

  // 日期 (YYYY-MM-DD 或 YYYY/MM/DD，支持单数字月日)
  date: {
    match: /\d{4}[-/]\d{1,2}[-/]\d{1,2}/,
    value: (s) => s,
  },

  // 时间 (HH:MM:SS 或 HH:MM)
  time: {
    match: /\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/,
    value: (s) => s,
  },

  // UUID (格式：8-4-4-4-12 的十六进制)
  // 示例：550e8400-e29b-41d4-a716-446655440000
  uuid: {
    match:
      /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/,
    value: (s) => s,
  },

  // ============================================
  // 2. 包管理与版本号 (容易与数字或路径混淆，需靠前)
  // ============================================

  // NPM 包名+版本 (必须在单纯包名之前！)
  // 修正：移动到 npm_package 之前
  npm_package_with_version: {
    match:
      /(?:@[a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-._~]+|[a-z0-9-~][a-z0-9-._~]*)@(?:[v~^]?\d+\.\d+\.\d+(?:[x*]|\.[x*])?|[a-zA-Z0-9.-]+)/,
    value: (s) => s,
  },

  // NPM 包名 (带作用域或不带)
  // 放在 framework_directive 之前，因为都以 @ 开头
  npm_package: {
    match: /@[a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-._~]+/,
    value: (s) => s,
  },

  // Python/Ruby/PHP 包名+版本 (requests==2.31.0)
  package_with_version: {
    match: /[a-zA-Z][a-zA-Z0-9_-]*(?:==|>=|<=|~=|!=|~>|[~^])(?:\d+(?:\.\d+)*)/,
    value: (s) => s,
  },

  // 带标签的版本号 (v1.0.0-beta)
  version_with_tag: {
    match: /[v~^]?\d+\.\d+\.\d+-[a-zA-Z0-9.-]+/,
    value: (s) => s,
  },

  // IPv4 (必须在 version 和 number 之前)
  ip: {
    match: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    value: (s) => s,
  },

  // 普通版本号 (v1.0.2)
  // 必须在 number_unit 之前，否则 1.0.2 会被识别为 数字1.0 + .2
  version: {
    match: /[v~^]?\d+\.\d+\.\d+(?:[x*]|\.[x*])?/,
    value: (s) => s,
  },

  // ============================================
  // 3. 框架与代码结构 (包含 @ : [ ] 等符号)
  // ============================================

  // Python/Java 注解 (@Override)
  decorator: {
    match: /@[\w]+(?:\.[\w]+)+/,
    value: (s) => s,
  },

  // Tailwind CSS 状态前缀 (hover:bg-red)
  // 放在 framework_directive 之前，防止被 :prop 误伤
  tailwind_state: {
    match: /[a-zA-Z][a-zA-Z0-9-]*:[a-zA-Z0-9\-[\]#]+/,
    value: (s) => s,
  },

  // Vue/Angular 指令 (@click, :prop)
  framework_directive: {
    match: /[@*v][\w-]+(?:\.[\w-]+)*|:[a-z]+(?=[\s,./)]|$)/,
    value: (s) => s,
  },

  // Tailwind Arbitrary Values (w-[10px])
  tailwind_arbitrary: {
    match: /[a-zA-Z][a-zA-Z0-9-]*-\[[^\]]+\]/,
    value: (s) => s,
  },

  // 泛型 (List<String>)
  generic_type: {
    match: /\b[A-Z]\w*<[\w\s,<>]+>/,
    value: (s) => s,
  },

  // CLI 参数 (--save)
  // 必须在 operator 之前 (- 会被 operator 匹配)
  cli_flag: {
    match: /-{1,2}[a-zA-Z][a-zA-Z0-9-]*/,
    value: (s) => s,
  },

  // ============================================
  // 4. 文件与路径
  // ============================================

  // 点文件 (.env)
  // 必须在 compound_word 之前，否则会被识别为 compound_word
  dotfile: {
    match: /\.[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*/,
    value: (s) => s,
  },

  // 路径 (/usr/bin)
  // 包含斜杠，必须在 compound_word 之前
  path: {
    match: /(?:\/|[a-zA-Z]:\\)[a-zA-Z0-9._\-/\\]+/,
    value: (s) => s,
  },

  // ============================================
  // 5. 基础值类型
  // ============================================

  // 数字/百分比 (必须放在 IP 和 Version 之后)
  number_unit: {
    match: /[$¥]?\d+(?:\.\d+)?%?/,
    value: (s) => s,
  },

  // ============================================
  // 6. 符号与操作符
  // ============================================

  // 强操作符
  operator: {
    match:
      /===|!==|\.\.\.|::|=>|->|&&|\|\||\+\+|--|<<|>>|\*\*|\+=|-=|!|\?|\||&|\^|~|%|\+|-|\*|\//,
    value: (s) => s,
  },

  // 括号
  parentheses: {
    match: /\(|\)|\(\)/,
    value: (s) => s,
  },

  // ============================================
  // 7. 通用标识符 (优先级最低的具体规则)
  // ============================================

  // 复合词汇 (Node.js, TCP/IP, user_id)
  // 这是“兜底”的标识符规则，放在最后，防止吃掉前面的特定格式
  compound_word: {
    match: /[a-zA-Z0-9_]+(?:[.\-/][a-zA-Z0-9_]+)+[+#]*|[a-zA-Z0-9_]+[+#]*/,
    value: (s) => s,
  },

  // ============================================
  // 8. 兜底 (文本与空白)
  // ============================================

  // 忽略空白
  whitespace: {
    match: /[ \t\r\n]+/,
    lineBreaks: true,
  },

  // 任何未匹配的字符序列
  text: {
    match: /[^ \t\r\n]+/,
    lineBreaks: true,
  },
});

// ========== 自定义词典管理 ==========

/**
 * 获取自定义词典（带缓存）
 */
const getCustomDictionary = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const customWords = await prisma.customDictionary.findMany({
        select: { word: true },
      });

      const words: string[] = [];
      for (const { word } of customWords) {
        if (word?.trim()) {
          words.push(word.replaceAll(" ", ""));
        }
      }
      return words;
    } catch (error) {
      console.error("[自定义词典] 查询失败:", error);
      return [];
    }
  },
  ["custom-dictionary"],
  { tags: ["custom-dictionary"], revalidate: false },
);

// ========== 语义裂变处理 ==========

/**
 * 语义裂变处理器
 * 将复合词拆解为多个搜索令牌（统一转小写）
 *
 * 例如：
 * "Next.js" -> ["next.js", "next", "js"]
 * "user_id" -> ["user_id", "user", "id"]
 * "TCP/IP" -> ["tcp/ip", "tcp", "ip"]
 */
function expandSemantics(token: string, type: TokenType): string[] {
  const results = new Set<string>();
  const raw = token.trim();
  const lower = raw.toLowerCase();

  // 不要删除这行日志，用于调试不同类型 token 的裂变效果
  console.log("Expanding token:", raw, "of type:", type);

  // 1. 保留小写版本
  results.add(lower);

  // 2. 根据类型进行裂变
  switch (type) {
    case TOKEN_TYPES.DOTFILE: {
      // .env.local -> .env.local, env.local, env, local
      // 添加原词
      results.add(lower);

      // 移除开头的点
      const withoutDot = lower.slice(1);
      if (withoutDot) {
        results.add(withoutDot);

        // 如果有点，继续拆分
        // env.local -> env, local
        withoutDot.split(".").forEach((part) => {
          if (part.length > 1) {
            results.add(part);
          }
        });
      }
      break;
    }

    case TOKEN_TYPES.VERSION_WITH_TAG: {
      // v2.0.1-beta -> v2.0.1-beta, v2.0.1, 2.0.1, beta
      // 添加原词
      results.add(lower);

      // 提取标签部分 (匹配 v2.0.1-beta 或 2.0.1-beta 格式)
      const tagMatch = lower.match(
        /^(?:[v~^])?(?:\d+\.){2}\d+-([a-zA-Z0-9.-]+)$/,
      );
      if (tagMatch && tagMatch[1]) {
        // 添加标签
        results.add(tagMatch[1]);

        // 移除标签，保留带前缀的版本号
        const versionWithPrefix = lower.substring(0, lower.indexOf("-"));
        results.add(versionWithPrefix);

        // 移除前缀和标签，只保留纯版本号
        const versionOnly = versionWithPrefix.replace(/^[v~^]/, "");
        if (versionOnly !== versionWithPrefix) {
          results.add(versionOnly);
        }
      }
      break;
    }

    case TOKEN_TYPES.TAILWIND_ARBITRARY: {
      // w-[100px] -> w-[100px], w, 100px
      // min-h-[500px] -> min-h-[500px], min, h, 500px
      // "min-h-[500px] -> min-h-[500px], min, h, 500px (去掉引号)
      // min-h-["500px"] -> min-h-["500px"], min, h, 500px (去掉内部引号)
      // 去掉前后引号等边界字符
      const cleaned = lower.replace(/^['"`]|['"`]$/g, "");
      // 添加清理后的原词（只添加 cleaned，不添加 lower，避免重复）
      results.add(cleaned);

      // 提取方括号内的值
      const bracketMatch = cleaned.match(/\[([^\]]+)\]$/);
      if (bracketMatch && bracketMatch[1]) {
        // 提取前缀部分（方括号之前的纯字母部分，去掉尾部的连字符）
        const beforeBracket = cleaned.substring(0, cleaned.indexOf("["));
        const prefix = beforeBracket.replace(/-+$/, ""); // 去掉尾部的连字符

        if (prefix) {
          // 添加完整前缀
          results.add(prefix);

          // 使用 kebabCase 进一步拆分前缀（min-h -> min, h）
          const prefixParts = kebabCase(prefix).split("-");
          prefixParts.forEach((part) => {
            if (part.length > 1 || part === "w" || part === "h") {
              results.add(part);
            }
          });
        }

        // 去掉方括号内值的引号后添加（最后添加，保持搜索权重）
        const bracketValue = bracketMatch[1].replace(/^['"`]|['"`]$/g, "");
        results.add(bracketValue);
      }
      break;
    }

    case TOKEN_TYPES.TAILWIND_STATE: {
      // hover:bg-red-500 -> hover:bg-red-500, hover, bg-red-500, bg, red, 500
      // dark:bg-black -> dark:bg-black, dark, bg-black, bg, black
      // 添加原词
      results.add(lower);

      // 按冒号拆分
      const colonIndex = lower.indexOf(":");
      if (colonIndex > 0) {
        // 提取状态前缀（hover, dark, focus等）
        const state = lower.substring(0, colonIndex);
        results.add(state);

        // 提取类名部分（bg-red-500）
        const className = lower.substring(colonIndex + 1);
        results.add(className);

        // 进一步拆分类名（使用 kebabCase）
        const classParts = kebabCase(className).split("-");
        classParts.forEach((part) => {
          if (part.length > 1 || part === "w" || part === "h") {
            results.add(part);
          }
        });
      }
      break;
    }

    case TOKEN_TYPES.NPM_PACKAGE: {
      // @radix-ui/react-dialog -> @radix-ui/react-dialog, @radix-ui, radix-ui, radix, ui, react-dialog, react, dialog
      // @types/node -> @types/node, @types, types, node
      results.add(lower); // 添加完整包名

      // 按 / 拆分
      const slashIndex = lower.indexOf("/");
      if (slashIndex > 0) {
        // 添加 @scope 部分
        const scope = lower.substring(0, slashIndex);
        results.add(scope); // @radix-ui

        // 进一步拆分 scope（去掉 @）
        const scopeWithoutAt = scope.replace(/^@/, "");
        results.add(scopeWithoutAt); // radix-ui

        // 使用 kebabCase 拆分 scope 部分
        const scopeParts = kebabCase(scopeWithoutAt).split("-");
        scopeParts.forEach((part) => {
          if (part.length > 1) {
            results.add(part);
          }
        });

        // 添加包名部分，并进一步拆分
        const packageName = lower.substring(slashIndex + 1);
        results.add(packageName); // react-dialog

        // 使用 kebabCase 进一步拆分包名
        const packageParts = kebabCase(packageName).split("-");
        packageParts.forEach((part) => {
          if (part.length > 1) {
            results.add(part);
          }
        });
      } else {
        // 没有 / 的情况，使用 kebabCase 拆分
        const standardized = kebabCase(raw);
        standardized.split("-").forEach((part) => {
          if (part.length > 1 || part === "c" || part === "r") {
            results.add(part);
          }
        });
      }
      break;
    }

    case TOKEN_TYPES.NPM_PACKAGE_WITH_VERSION: {
      // @nestjs/core@^10.3.0 -> @nestjs/core, ^10.3.0, 10.3.0
      // react@18.0.0 -> react, 18.0.0
      results.add(lower); // 添加完整字符串

      // 按 @ 拆分包名和版本
      const atIndex = lower.indexOf("@", 1); // 从索引 1 开始，跳过开头的 @
      if (atIndex > 0) {
        const packageName = lower.substring(0, atIndex);
        const version = lower.substring(atIndex + 1);

        results.add(packageName); // @nestjs/core
        results.add(version); // ^10.3.0

        // 如果版本号有前缀，去掉前缀后再添加
        const versionWithoutPrefix = version.replace(/^[v~^]/, "");
        if (versionWithoutPrefix !== version) {
          results.add(versionWithoutPrefix); // 10.3.0
        }

        // 进一步拆分包名（复用 npm_package 的逻辑）
        const slashIndex = packageName.indexOf("/");
        if (slashIndex > 0) {
          const scope = packageName.substring(0, slashIndex);
          results.add(scope); // @nestjs

          const scopeWithoutAt = scope.replace(/^@/, "");
          results.add(scopeWithoutAt); // nestjs

          const actualPackageName = packageName.substring(slashIndex + 1);
          results.add(actualPackageName); // core
        } else {
          results.add(packageName.replace(/^@/, "")); // react (没有 @scope 的情况)
        }
      }
      break;
    }

    case TOKEN_TYPES.PACKAGE_WITH_VERSION: {
      // requests==2.31.0 -> requests==2.31.0, requests, ==, 2.31.0
      // django>=4.2 -> django>=4.2, django, >=, 4.2
      // gem~>2.0 -> gem~>2.0, gem, ~>, 2.0
      // react^18.0.0 -> react^18.0.0, react, ^, 18.0.0
      results.add(lower); // 添加完整字符串

      // 匹配版本约束符号和版本号
      const versionMatch = lower.match(/(==|>=|<=|~=|!=|~>|[~^])(.+)/);
      if (versionMatch && versionMatch[1] && versionMatch[2]) {
        const operator = versionMatch[1];
        const version = versionMatch[2];
        const packageName = lower.substring(0, lower.indexOf(operator));

        results.add(packageName); // requests/gem/react
        results.add(operator); // ==/~>/^

        // 对版本号继续分词（可能包含多个点）
        // 2.31.0 会被拆分为 2.31.0（完整版本号）
        results.add(version); // 2.31.0
      }
      break;
    }

    case TOKEN_TYPES.CLI_FLAG: {
      // --save-dev -> --save-dev, save-dev, save, dev
      // --force -> --force, force
      // -v -> -v, v
      results.add(lower); // 添加完整标志

      // 去掉前缀（- 或 --）
      const withoutPrefix = lower.replace(/^-+/, "");
      results.add(withoutPrefix);

      // 使用 kebabCase 进一步拆分
      const parts = kebabCase(withoutPrefix).split("-");
      parts.forEach((part) => {
        if (part.length > 1 || part === "v" || part === "f") {
          results.add(part);
        }
      });
      break;
    }

    case TOKEN_TYPES.PATH:
    case TOKEN_TYPES.COMPOUND_WORD:
    case TOKEN_TYPES.FRAMEWORK_DIRECTIVE: {
      // 使用 kebabCase 智能拆解
      // kebabCase('Next.js') -> 'next-js'
      // kebabCase('user_id') -> 'user-id'
      // kebabCase('TCP/IP') -> 'tcp-ip'
      const standardized = kebabCase(raw);

      // 将标准化后的词拆分成原子
      standardized.split("-").forEach((part) => {
        // 过滤掉单个字母（除非是常见的单字母如 c、r）
        if (part.length > 1 || part === "c" || part === "r") {
          results.add(part);
        }
      });
      break;
    }

    case TOKEN_TYPES.GENERIC_TYPE: {
      // List<String> -> list, string
      const parts = kebabCase(raw).split("-");
      parts.forEach((part) => {
        if (part.length > 1) {
          results.add(part);
        }
      });
      break;
    }

    case TOKEN_TYPES.VERSION: {
      // v1.2.3 -> v1.2.3, 1.2.3
      // ^1.0.0 -> ^1.0.0, 1.0.0
      // ~2.4.x -> ~2.4.x, 2.4.x
      // 去掉前缀符号
      const withoutPrefix = lower.replace(/^[v~^]/, "");
      if (withoutPrefix !== lower) {
        results.add(withoutPrefix);
      }
      break;
    }

    case TOKEN_TYPES.DECORATOR: {
      // @app.route -> app.route, app, route
      const decoratorName = lower.replace(/^@/, "");
      results.add(decoratorName);
      decoratorName.split(".").forEach((part) => {
        if (part.length > 1) {
          results.add(part);
        }
      });
      break;
    }

    case TOKEN_TYPES.URL: {
      // https://github.com/org/repo/issues -> github.com, github, org, repo, issues
      // 提取域名
      try {
        // 去掉协议
        const urlWithoutProtocol = lower.replace(/^[a-z]+:\/\//, "");

        // 提取域名（到第一个 / 或 : 或 ? 或 # 为止）
        const domainEndIndex = urlWithoutProtocol.search(/[/:?#]/);
        let domain = "";
        let path = "";

        if (domainEndIndex > 0) {
          domain = urlWithoutProtocol.substring(0, domainEndIndex);
          path = urlWithoutProtocol.substring(domainEndIndex);
        } else {
          domain = urlWithoutProtocol;
        }

        if (domain) {
          results.add(domain); // github.com

          // 去掉 www. 前缀
          const domainWithoutWww = domain.replace(/^www\./, "");
          if (domainWithoutWww !== domain) {
            results.add(domainWithoutWww);
          }

          // 提取纯域名（去掉 .com 等后缀）
          const domainParts = domain.split(".");
          domainParts.forEach((part) => {
            if (part.length > 2 || part === "github" || part === "gitlab") {
              results.add(part);
            }
          });
        }

        // 拆分路径
        if (path) {
          // 去掉开头的 / 和末尾的 /
          const cleanPath = path.replace(/^\/+|\/+$/g, "");
          // 按 / 拆分
          const pathParts = cleanPath.split("/");
          pathParts.forEach((part) => {
            if (part && part.length > 0) {
              results.add(part);
            }
          });
        }
      } catch (error) {
        // 如果解析失败，至少保留原始 URL
        console.error("[URL 解析失败]", error);
      }
      break;
    }

    case TOKEN_TYPES.IPV6:
      // IPv6 地址通常不需要拆分，保留完整形式
      break;

    case TOKEN_TYPES.PARENTHESES:
      // 圆括号：(), (, ) - 直接保留，不需要拆分
      break;

    case TOKEN_TYPES.UUID:
      // UUID：550e8400-e29b-41d4-a716-446655440000
      // UUID 是一个完整的标识符，不应该拆分
      break;

    case TOKEN_TYPES.IP:
    case TOKEN_TYPES.EMAIL:
    case TOKEN_TYPES.DATE:
    case TOKEN_TYPES.TIME:
      // 这些通常不需要拆分，用户搜索时通常搜全称
      break;
  }

  return Array.from(results);
}

// ========== 验证与过滤 ==========

/**
 * Token 验证规则
 */
const VALIDATORS = {
  /** 检查是否为空 */
  notEmpty: (token: string): boolean => token.trim().length > 0,

  /** 检查最大长度 */
  maxLength: (token: string): boolean => token.length <= MAX_TOKEN_LENGTH,

  /** 检查是否包含有效字符（字母、数字或中文） */
  hasValidContent: (token: string): boolean =>
    /[a-zA-Z0-9\u4e00-\u9fa5]/.test(token),

  /** 检查是否为停止词 */
  notStopWord: (token: string): boolean => !STOP_WORDS.has(token.toLowerCase()),
} as const;

/**
 * 判断 token 是否有效
 */
function isValidToken(token: string): boolean {
  return (
    VALIDATORS.notEmpty(token) &&
    VALIDATORS.maxLength(token) &&
    VALIDATORS.hasValidContent(token)
  );
}

/**
 * 版本操作符和编程符号集合（保留这些纯符号 token）
 * Python pip: ==, >=, <=, ~=, !=, <, >
 * npm/Node.js: ^, ~, >=, <=, >, <, =, *, x
 * Ruby bundler: ~>, >=, <=, >, <, =
 * PHP composer: ^, ~, >=, <=, >, <, =, *
 * Rust Cargo: ^, ~, >=, <=, >, <, =, *
 * 编程符号: (), (), (), ., []
 */
const PROGRAMMING_SYMBOLS = new Set([
  // 版本操作符
  "==",
  ">=",
  "<=",
  "~=",
  "!=",
  "~>",
  "<",
  ">",
  "~",
  "^",
  "=",
  "*",
  "x",
  // 编程操作符 (Moo)
  "===",
  "!==",
  "...",
  "::",
  "=>",
  "->",
  "&&",
  "||",
  "++",
  "--",
  "<<",
  ">>",
  "**",
  "+=",
  "-=",
  // 单字符操作符
  "!",
  "?",
  "|",
  "&",
  "%",
  "+",
  "-",
  "/",
  // 圆括号
  "(",
  ")",
  "()",
  // 方括号
  "[",
  "]",
  "[]",
  // 花括号
  "{",
  "}",
  "{}",
]);

/**
 * 过滤停止词和无效 token
 * 注意：不进行去重，保留重复 token 以影响查询权重（tsvector 会自动处理）
 */
function postprocess(tokens: string[]): string[] {
  const result: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // 跳过无效 token
    if (!isValidToken(token)) {
      // 但如果是编程符号（版本操作符、括号等），保留它（使用小写比较）
      if (!PROGRAMMING_SYMBOLS.has(lower)) {
        continue;
      } else {
        console.log("[postprocess] 保留编程符号:", token);
      }
    }

    // 跳过停止词
    if (VALIDATORS.notStopWord(lower) || PROGRAMMING_SYMBOLS.has(lower)) {
      result.push(token);
    }
  }

  console.log("[postprocess] 最终结果:", result);
  return result;
}

// ========== 主入口 ==========

/**
 * 分析文本并返回分词结果
 *
 * @param text - 要分析的文本内容
 * @returns 分词后的 token 数组（已过滤停止词、转小写）
 *
 * @example
 * const tokens = await analyzeText('这是使用 Next.js 生成的文本');
 * // ['使用', 'next.js', 'next', 'js', '生成', '文本']
 */
export async function analyzeText(text: string): Promise<string[]> {
  if (!text) return [];

  try {
    // 1. 获取 TokenizerManager 实例
    const manager = TokenizerManager.getInstance();

    // 2. 获取 jieba 实例（会自动加载自定义词典）
    const jiebaInstance = await manager.getJieba();

    // 3. 使用数组而不是 Set，保留重复 token 以影响查询权重
    const finalTokens: string[] = [];

    // 4. 重置 Lexer 状态
    lexer.reset(text);

    // 5. 消费 Token
    for (const token of lexer) {
      if (token.type === TOKEN_TYPES.WHITESPACE) continue;

      console.log("[Lexer] Token:", token.value, "Type:", token.type);

      if (token.type === TOKEN_TYPES.TEXT) {
        // 使用 jieba 搜索引擎模式进行中文分词
        // cutForSearch 返回包括完整词和子词的分词结果
        const zhTokens = jiebaInstance.cutForSearch(token.value, true);
        zhTokens.forEach((t) => {
          if (t && t.trim()) {
            finalTokens.push(t.toLowerCase());
          }
        });
      } else {
        // 特殊格式 -> 语义裂变
        const expanded = expandSemantics(token.value, token.type as TokenType);
        expanded.forEach((t) => {
          finalTokens.push(t);
        });
      }
    }

    // 6. 后处理：过滤停止词和无效 token
    const result = postprocess(finalTokens);

    return result;
  } catch (error) {
    console.error("[分词器] 处理文本失败:", error);
    // 降级：返回空数组
    return [];
  }
}

/**
 * 手动重置分词器词典（用于测试或强制刷新）
 */
export async function resetTokenizerDictionary(): Promise<void> {
  try {
    const manager = TokenizerManager.getInstance();
    await manager.resetDictionary();
  } catch (error) {
    console.error("[分词器] 重置词典失败:", error);
    throw error;
  }
}

/**
 * 获取当前词典哈希值
 */
export function getCurrentDictHash(): string {
  const manager = TokenizerManager.getInstance();
  return manager.getCurrentDictHash();
}
