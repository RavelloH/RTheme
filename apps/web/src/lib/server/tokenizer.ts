/**
 * 文本分词库
 * 用于中英文混合文本的分词处理，支持自定义词典和停止词过滤
 *
 * 采用"从粗到细"的分词策略：
 * 1. 预处理：清理不可见字符、HTML/Markdown 语法
 * 2. 粗分：按语言类型（中文/英文/符号）切分成片段
 * 3. 细分：对英文进行驼峰拆分、符号处理；对中文使用 pinyin-pro 分词
 * 4. 后处理：过滤停止词和无效 token
 */
import "server-only";
import { segment, OutputFormat, addDict, pinyin } from "pinyin-pro";
import CompleteDict from "@pinyin-pro/data/complete";
import prisma from "@/lib/server/prisma";
import { unstable_cache } from "next/cache";

// ========== 初始化 ==========
addDict(CompleteDict);

// ========== 常量定义 ==========

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
  // 域名后缀
  "http",
  "https",
  "www",
  "com",
  "cn",
  "net",
  "org",
]);

/** 需要保护的操作符（按长度从长到短排序） */
const PROTECTED_OPERATORS = [
  // 三字符
  "===",
  "!==",
  "...",
  "---",
  // 双字符
  "==",
  "!=",
  "<=",
  ">=",
  "=>",
  ":=",
  "->",
  "?>",
  "&&",
  "||",
  "++",
  "--",
  "<<",
  ">>",
  "**",
  "~/",
];

/** 操作符正则（用于验证 token 是否为操作符） */
const OPERATOR_REGEX =
  /^(===?|!==?|<=?|>=?|=>|:=|->|\?>|<|>|&&|\|\||[+]{2}|-{2}|<<|>>|\*\*|[+\-*/%&|^]=|\\[dws]|\.{3}|-{3}|~\/|\$)$/;

/** 片段类型 */
type SegmentType = "chinese" | "english" | "operator" | "mixed";

/** 片段接口 */
interface TextSegment {
  type: SegmentType;
  content: string;
}

// ========== 自定义词典管理 ==========

/** 用于追踪当前已加载的词典内容的哈希值 */
let loadedDictHash = "";

/** 计算词典的简单哈希值（用于检测变更） */
function hashDict(dict: Record<string, [string, number]>): string {
  return Object.keys(dict).sort().join(",");
}

/** 从数据库获取自定义词典数据（带缓存） */
const getCustomDictionary = unstable_cache(
  async (): Promise<Record<string, [string, number]>> => {
    try {
      const customWords = await prisma.customDictionary.findMany({
        select: { word: true },
      });

      const dict: Record<string, [string, number]> = {};
      for (const { word } of customWords) {
        if (!word?.trim()) continue;
        dict[word] = [pinyin(word, { toneType: "symbol" }), 1];
      }
      return dict;
    } catch (error) {
      console.error("加载自定义词典失败:", error);
      return {};
    }
  },
  ["custom-dictionary"],
  { tags: ["custom-dictionary"], revalidate: false },
);

/** 加载并注入自定义词典到 pinyin-pro */
async function loadCustomDictionary(): Promise<void> {
  const dict = await getCustomDictionary();
  const currentHash = hashDict(dict);

  if (currentHash === loadedDictHash) return;

  if (Object.keys(dict).length > 0) {
    addDict(dict, "custom");
  }
  loadedDictHash = currentHash;
}

// ========== 阶段1：预处理 ==========

/** 保护操作符，返回处理后的文本和映射表 */
function protectOperators(text: string): {
  text: string;
  map: Map<string, string>;
} {
  const map = new Map<string, string>();
  let result = text;

  PROTECTED_OPERATORS.forEach((op, i) => {
    const placeholder = `__OP${i}__`;
    if (result.includes(op)) {
      result = result.replaceAll(op, placeholder);
      map.set(placeholder, op);
    }
  });

  return { text: result, map };
}

/** 恢复被保护的操作符 */
function restoreOperators(text: string, map: Map<string, string>): string {
  let result = text;
  for (const [placeholder, op] of map) {
    result = result.replaceAll(placeholder, op);
  }
  return result;
}

/** 处理 HTML 标签：提取 Vue 指令，识别泛型语法 */
function processHtmlTags(text: string): string {
  return text.replace(
    /<([^>]*)>/g,
    (match, content: string, offset: number) => {
      const trimmed = content.trim();

      // 闭合标签或注释
      if (/^[/!]/.test(trimmed)) return " ";

      // 检查是否为泛型语法
      const beforeChar = offset > 0 ? text[offset - 1] : "";
      const isAfterWord = beforeChar ? /[a-zA-Z0-9_]/.test(beforeChar) : false;

      // 泛型情况
      if (isAfterWord) {
        if (/^[a-zA-Z0-9_]+$/.test(trimmed)) return match; // Box<T>
        if (/^[A-Z](?:\s|,|>)/.test(trimmed)) return match; // <T extends>
        if (/^[A-Z][a-zA-Z0-9]*(?:\s*[,<>]|$)/.test(trimmed)) return match; // <String, List>
      }

      // HTML/JSX 标签
      const startsWithLowercase = /^[a-z]/.test(trimmed);
      const isComponent = /^[A-Z][a-z]/.test(trimmed) && /\s/.test(trimmed);

      if (startsWithLowercase || isComponent) {
        // 提取 Vue 指令
        const vueAttrs = [
          ...content.matchAll(/[@:v-][a-zA-Z-]+(?:\.[a-zA-Z]+)*/g),
        ].map((m) => m[0]);
        return vueAttrs.length > 0 ? ` ${vueAttrs.join(" ")} ` : " ";
      }

      // 组件标签（无属性）
      if (/^[A-Z][a-zA-Z0-9]+\s*\/?$/.test(trimmed)) {
        return ` ${trimmed.replace(/\s*\/?$/, "")} `;
      }

      return match;
    },
  );
}

/** 清理不可见字符和 Markdown 语法 */
function cleanMarkdownAndControl(text: string): string {
  return (
    text
      .replace(/[\r\n]+/g, " ")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/```(\w+)?/g, " $1 ")
      .replace(/\*{2,}/g, " ")
      // 移除 Markdown 强调下划线（不匹配 __init__ 等 Python 魔法方法）
      .replace(
        /(?<![a-zA-Z0-9])_{2}(?![a-zA-Z0-9_])|(?<![a-zA-Z0-9_])_{2}(?![a-zA-Z0-9])/g,
        " ",
      )
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/>\s*/g, " ")
      .replace(/^\s*[-*+]\s+/gm, " ")
  );
}

/** 处理标点符号 */
function processPunctuation(text: string): string {
  let result = text;

  // 保护需要特殊处理的 token
  const protectedTokens = new Map<string, string>();
  let tokenIndex = 0;

  // 保护 Rust 生命周期（'static 和单字母如 'a, 'b 等）
  // 只匹配常见的 Rust 生命周期模式
  result = result.replace(/(?<=^|\s)'(static|[a-z])(?=\s|$|>|,)/g, (match) => {
    const placeholder = `XPKGX${tokenIndex}XPKGX`;
    protectedTokens.set(placeholder, match);
    tokenIndex++;
    return placeholder;
  });

  // 保护日期格式（YYYY-MM-DD）
  result = result.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match) => {
    const placeholder = `XPKGX${tokenIndex}XPKGX`;
    protectedTokens.set(placeholder, match);
    tokenIndex++;
    return placeholder;
  });

  // 保护版本号（^1.2.3, ~2.0.0）
  result = result.replace(/[~^]\d+\.\d+\.\d+/g, (match) => {
    const placeholder = `XPKGX${tokenIndex}XPKGX`;
    protectedTokens.set(placeholder, match);
    tokenIndex++;
    return placeholder;
  });

  // 保护百分比（50%）
  result = result.replace(/\d+%/g, (match) => {
    const placeholder = `XPKGX${tokenIndex}XPKGX`;
    protectedTokens.set(placeholder, match);
    tokenIndex++;
    return placeholder;
  });

  // npm 包名格式（@scope/package-name）
  // @scope 完整保留，package 部分按连字符规则处理
  result = result.replace(
    /@([a-zA-Z0-9_-]+)\/([a-zA-Z0-9._-]+)/g,
    (_match, scope, pkg: string) => {
      // @scope 保护（包括其中的连字符）
      const scopePlaceholder = `XPKGX${tokenIndex}XPKGX`;
      protectedTokens.set(scopePlaceholder, `@${scope}`);
      tokenIndex++;

      // package 部分：检查连字符数量决定是否拆分
      const hyphenCount = (pkg.match(/-/g) || []).length;
      if (hyphenCount > 1) {
        // 3个及以上部分：拆分
        return `${scopePlaceholder} ${pkg.replace(/-/g, " ")}`;
      } else {
        // 2个或更少部分：保护整个包名
        const pkgPlaceholder = `XPKGX${tokenIndex}XPKGX`;
        protectedTokens.set(pkgPlaceholder, pkg);
        tokenIndex++;
        return `${scopePlaceholder} ${pkgPlaceholder}`;
      }
    },
  );

  // 保护 Python 装饰器模式（@app.route, @pytest.mark 等）
  result = result.replace(
    /@([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_.]*)/g,
    (match) => {
      const placeholder = `XPKGX${tokenIndex}XPKGX`;
      protectedTokens.set(placeholder, match);
      tokenIndex++;
      return placeholder;
    },
  );

  // 保护单独的 @ 前缀词（如 @click, @scope, @app.route 没有后面包名的情况）
  result = result.replace(/@([a-zA-Z0-9_.-]+)(?![/\w])/g, (_match, name) => {
    const placeholder = `XPKGX${tokenIndex}XPKGX`;
    protectedTokens.set(placeholder, `@${name}`);
    tokenIndex++;
    return placeholder;
  });

  // 处理开头的斜杠（路径开头）
  result = result.replace(/^\//g, " ");

  // 移除末尾的斜杠
  result = result.replace(/\/$/g, " ");

  // 处理 REST 参数格式（只处理路径中的参数，如 /api/:id → /api/ id）
  // 保留 Vue 属性绑定如 :prop（不在路径中）
  result = result.replace(/\/(:)([a-zA-Z_][a-zA-Z0-9_]*)/g, "/ $2");

  // 处理斜杠：区分路径和技术词
  // 技术词保留：TCP/IP, I/O, CI/CD, application/json 等
  // 路径拆分：Windows/System32, usr/local 等
  const slashMatches =
    result.match(/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)+/g) || [];
  for (const word of slashMatches) {
    const parts = word.split("/");
    const slashCount = parts.length - 1;

    // 判断是否为技术缩写词（全大写或常见 MIME 类型）
    const isAcronym = parts.every((p) => /^[A-Z]+$/.test(p)); // TCP/IP, I/O
    // MIME 类型必须是 类型/子类型 格式，且类型是标准的 MIME 主类型
    const mimeTypes = [
      "text",
      "image",
      "audio",
      "video",
      "application",
      "multipart",
      "message",
      "font",
      "model",
      "chemical",
    ];
    const isMimeType = parts.length === 2 && mimeTypes.includes(parts[0]!); // application/json
    const isProtocolPair = /^[A-Z]{2,}\/[A-Z]{2,}$/.test(word); // CI/CD

    if (isAcronym || isMimeType || isProtocolPair) {
      // 技术词保留
      continue;
    }

    if (slashCount >= 1) {
      // 路径拆分（Windows/System32 → Windows System32）
      result = result.replace(word, parts.join(" "));
    }
  }

  // 处理连字符：2个部分保留，3个及以上拆分
  const hyphenMatches = result.match(/[a-zA-Z0-9]+-[a-zA-Z0-9-]*/g) || [];
  for (const word of hyphenMatches) {
    const hyphenCount = (word.match(/-/g) || []).length;

    // 3个及以上部分：拆分（test-spilt-test → test spilt test）
    if (hyphenCount > 1) {
      result = result.replace(word, word.replace(/-/g, " "));
    }
    // 2个部分：保留（test-spilt → test-spilt）
  }

  // 处理下划线：2个部分保留，3个及以上拆分
  // 注意：__init__ 等 Python 魔术方法保留（以双下划线开头和结尾）
  const underscoreMatches =
    result.match(/[a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)+/g) || [];
  for (const word of underscoreMatches) {
    // 跳过 Python 魔术方法（被双下划线包围的词已经不会被匹配到这里）
    const underscoreCount = (word.match(/_/g) || []).length;

    // 3个及以上部分：拆分（test_spilt_test → test spilt test）
    if (underscoreCount > 1) {
      result = result.replace(word, word.replace(/_/g, " "));
    }
    // 2个部分：保留（test_spilt → test_spilt）
  }

  // 处理句末点号
  result = result.replace(/\.(?![a-zA-Z0-9])/g, " ");

  // 移除其他标点，保留有意义的符号
  // 保留的符号：+ - . @ # _ % $ ¥ : = > < & | ^ / \ ! *
  // 注意：单引号只在 Rust 生命周期中有意义，由正则单独处理
  result = result
    .replace(/[^\w\s+\-.@#_%$¥:=><&|^/\\!*\u4e00-\u9fa5]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 恢复被保护的 token
  for (const [placeholder, token] of protectedTokens) {
    result = result.replace(placeholder, token);
  }

  return result;
}

/** 预处理入口：清理文本 */
function preprocess(text: string): {
  cleanText: string;
  operatorMap: Map<string, string>;
} {
  let cleanText = text;

  // 移除 Unicode 转义序列 \uXXXX
  cleanText = cleanText.replace(/\\u([0-9a-fA-F]{4})/g, " u$1 ");

  // 移除转义字符（\n, \t, \r 等，但保留 \d, \w, \s）
  cleanText = cleanText.replace(/\\[ntr]/g, " ");

  // 处理 Windows 路径反斜杠（转为正斜杠）
  cleanText = cleanText.replace(/\\/g, "/");

  // 处理泛型语法：Vec<T> → Vec T, HashMap<K,V> → HashMap K V
  cleanText = cleanText.replace(
    /([a-zA-Z_][a-zA-Z0-9_]*)<([^<>]+)>/g,
    (_match, name, params: string) => {
      // 提取泛型参数，移除逗号和空格
      const cleanParams = params.replace(/[,\s]+/g, " ").trim();
      return `${name} ${cleanParams}`;
    },
  );

  // 处理 PHP/XML 标签
  cleanText = cleanText.replace(/<\?php\b/gi, " php ");
  cleanText = cleanText.replace(/<\?xml\b/gi, " xml ");
  cleanText = cleanText.replace(/\?>/g, " ");

  // 处理 SQL 函数中的星号
  cleanText = cleanText.replace(/\((\*)\)/g, " $1 ");

  // 处理正则表达式模式（只处理包含正则特征的内容）
  // /^[a-z]+$/ → ^[a-z]+$
  // 不处理普通路径如 /usr/local/
  cleanText = cleanText.replace(
    /\/(\^[^\\/]+\$|\[[^\]]+\](?:\+|\*|\?)?)\//g,
    " $1 ",
  );

  // 处理 try...catch 等省略号连接
  cleanText = cleanText.replace(/\.{3}(?=[a-zA-Z])/g, " ");

  // 处理非捕获组 (?:pattern) → pattern
  cleanText = cleanText.replace(/\(\?:/g, "(");
  // 处理前瞻断言等复杂模式
  cleanText = cleanText.replace(/\(\?[=!<][^)]*\)/g, " ");

  // 处理多段点分隔路径（3段及以上拆分，但保留配置文件名和技术名词）
  // 配置文件名模式：*.config.js, tsconfig.build.json 等
  // 技术名词：Node.js, Vue.js, www.google.com 等
  cleanText = cleanText.replace(
    /([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_.]*)/g,
    (match, p1, p2, p3: string) => {
      // 如果是配置文件名（以常见扩展名结尾），保留
      if (
        /\.(js|ts|json|yml|yaml|md|sh|py|rs|go|java|css|html|xml)$/i.test(match)
      ) {
        return match;
      }
      // 如果是域名（以常见 TLD 结尾），保留
      if (/\.(com|cn|org|net|io|dev|app|co|edu|gov)$/i.test(match)) {
        return match;
      }
      // 如果是方法调用模式（如 db.users.find），拆分
      if (/^[a-z]/.test(p1) && /^[a-z]/.test(p2) && /^[a-z]/.test(p3)) {
        // 检查是否像模块路径（全是标识符）
        if (!/[()]/.test(p3)) {
          return `${p1} ${p2} ${p3}`;
        }
      }
      return `${p1} ${p2} ${p3}`;
    },
  );

  // 保护操作符（在任何清理之前，避免被 Markdown 规则破坏）
  const { text: protectedText, map: operatorMap } = protectOperators(cleanText);
  cleanText = protectedText;

  // 处理 HTML 标签
  cleanText = processHtmlTags(cleanText);

  // 清理控制字符和 Markdown
  cleanText = cleanMarkdownAndControl(cleanText);

  // 处理标点
  cleanText = processPunctuation(cleanText);

  // 恢复操作符
  cleanText = restoreOperators(cleanText, operatorMap);

  return { cleanText, operatorMap };
}

// ========== 阶段2：粗分 ==========

/**
 * 粗分正则：匹配英文、操作符、特殊符号组合
 *
 * 支持：
 * - 盘符：C:, D:
 * - 邮箱：user@example.com
 * - 类邮箱ID：abc@123
 * - 斜杠技术词：TCP/IP, I/O, CI/CD, application/json（单斜杠保留）
 * - 技术词：Node.js, C++, C#, UTF-8
 * - 作用域前缀：@neutral-press, @repo（npm 包的作用域部分）
 * - Vue/Angular 指令：@click, :prop, v-model, *ngIf
 * - 泛型语法：Map<String, List<Integer>>
 * - 操作符：===, !==, &&, ||, <<, >>, :=, ->, ...
 * - 正则转义：\d, \w, \s
 * - 命令参数：-rf, --help
 * - 版本号：^1.2.3, ~2.0.0
 * - 百分比：50%
 * - 日期格式：2023-12-31
 * - Ruby类变量：@@class_var
 * - Rust生命周期：'static
 * - Rust引用类型：&str, &mut
 * - PHP标签：<?php
 * - 货币格式：$50.00
 * - npm包名：@scope/package-name
 * - Python装饰器：@app.route, @pytest.mark.skip
 */
const ENGLISH_TOKEN_REGEX =
  /@[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+|@[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+|\$\d+(?:\.\d+)?|[A-Z]:|[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+(?:\.[a-zA-Z]{2,})?|[a-zA-Z0-9]+\/[a-zA-Z0-9]+|[A-Z][+]{2}|[A-Z]#|<<|>>|\.{3}|-{3}|:=|->|\?>|~\/|@@?[a-zA-Z_][a-zA-Z0-9_-]*|\*[a-zA-Z]+|[~^][0-9]+\.[0-9.]+|\d+%|\d{4}-\d{2}-\d{2}|'[a-zA-Z]+|<\?[a-zA-Z]+|[@$#:!&]?[a-zA-Z0-9._-]+[+]{2}|-{1,2}[a-zA-Z]+|[@$#:!&]?[a-zA-Z0-9._\-:+]+(?:<[\w\s,<>]+>)?|===?|!==?|<=?|>=?|=>|&&|\|\||[+]{2}|-{2}|\*\*|[+\-*/%&|^]=|\\[dws]|\*|<|>|\.[a-zA-Z0-9]+/g;

/** 将文本粗分为片段 */
function coarseSegment(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ENGLISH_TOKEN_REGEX.exec(text)) !== null) {
    let token = match[0];
    const isOperator = OPERATOR_REGEX.test(token);

    // 普通 token 必须包含字母或数字
    if (!isOperator && !/[a-zA-Z0-9]/.test(token)) continue;

    // 清理 token
    if (!isOperator) {
      token = cleanEnglishToken(token);
      if (!token) continue;
    }

    // 添加之前的中文部分
    if (match.index > lastIndex) {
      const chinesePart = text.slice(lastIndex, match.index).trim();
      if (chinesePart) {
        segments.push({ type: "chinese", content: chinesePart });
      }
    }

    // 添加当前 token（保留原始大小写，细分后再转小写）
    segments.push({
      type: isOperator ? "operator" : "english",
      content: isOperator ? token.toLowerCase() : token,
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余的中文部分
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: "chinese", content: remaining });
    }
  }

  return segments;
}

/** 清理英文 token */
function cleanEnglishToken(token: string): string {
  let result = token.trim();

  // 点开头的文件名保持不变
  if (result.startsWith(".") && /\.[a-zA-Z]/.test(result)) {
    return result;
  }

  // 移除末尾孤立的点号
  result = result.replace(/\.$/, "");

  // 移除末尾孤立的冒号（除非是盘符或特殊前缀）
  // 盘符格式：C:, D: 等
  const isDriveLetter = /^[A-Za-z]:$/.test(result);
  if (!isDriveLetter && !/^[@$#:!][a-zA-Z]+/.test(result)) {
    result = result.replace(/:$/, "");
  }

  return result;
}

// ========== 阶段3：细分 ==========

/**
 * 拆分驼峰命名 (Always Split 策略)
 * 规则：不再合并2段，只要有驼峰或数字边界就拆分
 * 特殊处理：识别 UUID/哈希值等均匀字母数字混合模式，保持完整
 * * @example
 * splitCamelCase('useEffect') => ['use', 'effect']
 * splitCamelCase('IOError') => ['io', 'error']
 * splitCamelCase('http2Client') => ['http', '2', 'client']
 * splitCamelCase('a1b2c3d4') => ['a1b2c3d4'] // UUID 模式，保持完整
 * splitCamelCase('ff00ab') => ['ff00ab'] // 十六进制，保持完整
 */
function splitCamelCase(token: string): string[] {
  // 1. 过滤非字母数字字符
  if (!/^[a-zA-Z0-9]+$/.test(token)) return [token.toLowerCase()];

  // 2. 如果全小写或全大写（且不含数字边界），则不处理，直接返回小写
  // 例如: "make", "URL" -> "make", "url"
  if (/^[a-z]+$/.test(token) || /^[A-Z]+$/.test(token)) {
    return [token.toLowerCase()];
  }

  // 3. 检测均匀字母数字混合模式（UUID/哈希值/十六进制等）
  // 特征：字母和数字交替出现，且长度 >= 4，没有明显的驼峰模式
  // 例如：a1b2, c3d4, ff00ab, 9a8b7c
  const hasLetters = /[a-zA-Z]/.test(token);
  const hasDigits = /[0-9]/.test(token);
  const hasUpperCase = /[A-Z]/.test(token);

  // 如果同时包含字母和数字
  if (hasLetters && hasDigits) {
    // 如果只有小写字母+数字（如 a1b2c3, ff00ab），且长度 >= 4，保持完整
    // 这种模式通常是 UUID、哈希值、十六进制等标识符
    if (!hasUpperCase && token.length >= 4) {
      // 检查是否为均匀混合（不是明显的前缀+版本号模式）
      // 例如：a1b2c3（UUID）vs http2（前缀+版本）
      const letterCount = (token.match(/[a-z]/g) || []).length;
      const digitCount = (token.match(/[0-9]/g) || []).length;

      // 如果字母和数字的比例接近（都至少占 30%），视为均匀混合
      const minCount = Math.min(letterCount, digitCount);
      const totalCount = token.length;
      if (minCount / totalCount >= 0.3) {
        return [token.toLowerCase()];
      }
    }
  }

  return (
    token
      // 处理连续大写后跟小写 (XMLParser -> XML Parser)
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      // 处理小写/数字 后跟 大写 (camelCase -> camel Case)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      // (可选) 处理字母后跟数字 (v2 -> v 2) - 推荐开启，利于搜索版本号
      .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
      // (可选) 处理数字后跟字母 (2px -> 2 px)
      .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );
}

/** 对中文使用 pinyin-pro 分词 */
function segmentChinese(text: string): string[] {
  return segment(text, { format: OutputFormat.ZhSegment }).map((t) =>
    t.toLowerCase(),
  );
}

/** 对片段进行细分 */
function fineSegment(segments: TextSegment[]): string[] {
  const tokens: string[] = [];

  for (const seg of segments) {
    switch (seg.type) {
      case "chinese":
        tokens.push(...segmentChinese(seg.content));
        break;

      case "english":
        tokens.push(...splitCamelCase(seg.content));
        break;

      case "operator":
        tokens.push(seg.content);
        break;
    }
  }

  return tokens;
}

// ========== 阶段4：后处理 ==========

/** 特殊有效 token 正则（单独的符号也是有效的） */
const SPECIAL_VALID_TOKENS =
  /^(\$|\.{3}|-{3}|~\/|:=|->|\?>|@@?[a-zA-Z_]\w*|\*[a-zA-Z]+|'[a-zA-Z]+|[~^]\d+\.\d+\.\d+|\d+%|\d{4}-\d{2}-\d{2})$/;

/** 判断 token 是否有效 */
function isValidToken(token: string): boolean {
  const t = token.trim();
  if (!t) return false;

  // 操作符是有效的
  if (OPERATOR_REGEX.test(t)) return true;

  // 特殊有效 token
  if (SPECIAL_VALID_TOKENS.test(t)) return true;

  // 必须包含字母、数字或中文
  return /[a-zA-Z0-9\u4e00-\u9fa5]/.test(t);
}

/** 最大 token 长度 */
const MAX_TOKEN_LENGTH = 32;

/** 过滤停止词和无效 token */
function postprocess(tokens: string[]): string[] {
  return tokens.filter((token) => {
    if (!isValidToken(token)) return false;
    if (STOP_WORDS.has(token.toLowerCase())) return false;
    // 超过32字符的 token 丢弃
    if (token.length > MAX_TOKEN_LENGTH) return false;
    return true;
  });
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
 * // ['使用', 'next.js', '生成', '文本']
 */
export async function analyzeText(text: string): Promise<string[]> {
  if (!text) return [];

  // 1. 加载自定义词典
  await loadCustomDictionary();

  // 2. 预处理：清理 HTML、Markdown、标点等
  const { cleanText } = preprocess(text);

  // 3. 粗分：按语言类型切分
  const segments = coarseSegment(cleanText);

  // 4. 细分：驼峰拆分、中文分词
  const tokens = fineSegment(segments);

  // 5. 后处理：过滤停止词和无效 token
  return postprocess(tokens);
}
