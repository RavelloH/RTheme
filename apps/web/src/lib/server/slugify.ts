/**
 * Slugify 工具库
 * 用于将中文和英文文本转换为 URL 友好的 slug 格式
 */
import "server-only";
import {
  pinyin as pinyinPro,
  addDict,
  segment,
  OutputFormat,
} from "pinyin-pro";
import CompleteDict from "@pinyin-pro/data/complete";
import { getConfig } from "./config-cache";

addDict(CompleteDict);

/**
 * 将中文文本通过拼音转换为 slug 格式
 * @param text - 输入文本
 * @returns slug 格式的字符串 (例如: "zheshi-yipian-wenzhang")
 */
export async function slugify(text: string): Promise<string> {
  if (!text || typeof text !== "string") {
    return "";
  }

  // 去除首尾空格
  text = text.trim();

  if (!text) {
    return "";
  }

  // 获取配置，决定是否进行分词处理
  const enableSegment = await getConfig("content.slug.segment");
  if (enableSegment) {
    const pinyinText = segment(text, {
      toneType: "none",
      nonZh: "consecutive",
      separator: "-",
      format: OutputFormat.AllString,
    })
      .result.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const slug = pinyinText
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug;
  } else {
    // 1. 将中文转换为拼音，英文保持不变
    const pinyinText = pinyinPro(text, {
      toneType: "none", // 不带音调
      type: "array", // 返回数组格式
      nonZh: "consecutive", // 非中文字符连续输出
    });

    // 2. 处理每个部分
    const processedWords = pinyinText
      .map((word: string) => {
        // 去除空白字符
        word = word.trim();
        if (!word) return "";

        // 统一转换为小写并清理
        return word
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      })
      .filter((word: string) => word !== "");

    // 3. 连接所有处理后的词
    let slug = processedWords.join("-");

    // 4. 清理和规范化
    slug = slug
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug;
  }
}

/**
 * 验证 slug 格式是否有效
 * @param slug - 要验证的 slug
 * @returns 是否为有效的 slug 格式
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") {
    return false;
  }

  // slug 只能包含小写字母、数字和连字符
  // 不能以连字符开头或结尾
  // 不能有连续的连字符
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * 生成唯一的 slug（通过添加数字后缀）
 * @param baseSlug - 基础 slug
 * @param existingSlugs - 已存在的 slugs 集合
 * @returns 唯一的 slug
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: Set<string> | string[],
): string {
  const slugSet =
    existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs);

  if (!slugSet.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * 清理用户输入的 slug
 * 如果用户提供了自定义 slug，进行清理和验证
 * @param userSlug - 用户输入的 slug
 * @returns 清理后的 slug
 */
export function sanitizeUserSlug(userSlug: string): string {
  if (!userSlug || typeof userSlug !== "string") {
    return "";
  }

  return userSlug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // 空格替换为连字符
    .replace(/[^a-z0-9-]/g, "") // 删除非法字符
    .replace(/-+/g, "-") // 多个连字符替换为一个
    .replace(/^-+|-+$/g, ""); // 去除首尾连字符
}
