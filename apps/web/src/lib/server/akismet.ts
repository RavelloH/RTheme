/**
 * Akismet 反垃圾评论服务
 * 提供评论垃圾检测、提交垃圾评论和提交正常评论的功能
 */

import { AkismetClient } from "akismet-api";

import { getConfig } from "@/lib/server/config-cache";

// Akismet 客户端缓存
let akismetClient: AkismetClient | null = null;

/**
 * 获取 Akismet 客户端实例（单例模式）
 */
async function getAkismetClient(): Promise<AkismetClient | null> {
  const enabled = await getConfig("comment.akismet.enable");
  const apiKey = await getConfig("comment.akismet.apiKey");

  if (!enabled || !apiKey) {
    return null;
  }

  // 如果已有客户端实例，直接返回
  if (akismetClient) {
    return akismetClient;
  }

  try {
    // 从配置中获取站点 URL
    const siteUrl = await getConfig("site.url");

    // 创建 Akismet 客户端
    akismetClient = new AkismetClient({
      key: apiKey,
      blog: siteUrl,
      blog_lang: "zh_CN",
      blog_charset: "UTF-8",
    });

    // 验证 API Key 是否有效
    const isValid = await akismetClient.verifyKey();
    if (!isValid) {
      console.error("Akismet API Key 验证失败，请检查配置");
      akismetClient = null;
      return null;
    }

    console.log("Akismet 客户端初始化成功");
    return akismetClient;
  } catch (error) {
    console.error("Akismet 客户端初始化失败:", error);
    akismetClient = null;
    return null;
  }
}

/**
 * 评论数据接口
 */
export interface CommentData {
  /** 评论者 IP 地址 */
  userIp: string;
  /** 评论者 User Agent */
  userAgent?: string;
  /** Referer */
  referrer?: string;
  /** 评论永久链接 */
  permalink?: string;
  /** 评论类型（comment、trackback、pingback 等） */
  commentType?: string;
  /** 评论者名称 */
  commentAuthor?: string;
  /** 评论者邮箱 */
  commentAuthorEmail?: string;
  /** 评论者网站 */
  commentAuthorUrl?: string;
  /** 评论内容 */
  commentContent: string;
  /** 评论发布时间 */
  commentDateGmt?: Date;
  /** 文章发布时间 */
  commentPostModifiedGmt?: Date;
  /** 博客语言 */
  blogLang?: string;
  /** 博客字符集 */
  blogCharset?: string;
  /** 用户角色 */
  userRole?: string;
  /**
   * 是否测试模式
   */
  isTest?: boolean;
}

/**
 * 检查评论是否为垃圾评论
 * @param comment 评论数据
 * @returns 是否为垃圾评论
 */
export async function checkSpam(comment: CommentData): Promise<boolean> {
  try {
    const client = await getAkismetClient();
    if (!client) {
      // 如果 Akismet 未启用或配置无效，默认认为不是垃圾评论
      return false;
    }

    const isSpam = await client.checkSpam({
      user_ip: comment.userIp,
      user_agent: comment.userAgent,
      referrer: comment.referrer,
      permalink: comment.permalink,
      comment_type: comment.commentType || "comment",
      comment_author: comment.commentAuthor,
      comment_author_email: comment.commentAuthorEmail,
      comment_author_url: comment.commentAuthorUrl,
      comment_content: comment.commentContent,
      comment_date_gmt: comment.commentDateGmt?.toISOString(),
      comment_post_modified_gmt: comment.commentPostModifiedGmt?.toISOString(),
      user_role: comment.userRole,
      is_test: comment.isTest || false,
    });

    return isSpam;
  } catch (error) {
    console.error("Akismet 检查垃圾评论失败:", error);
    // 发生错误时，为了安全起见，认为不是垃圾评论
    return false;
  }
}

/**
 * 向 Akismet 提交垃圾评论（管理员标记为垃圾）
 * @param comment 评论数据
 * @returns 是否提交成功
 */
export async function submitSpam(comment: CommentData): Promise<boolean> {
  try {
    const reportEnabled = await getConfig("comment.akismet.report.enable");
    if (!reportEnabled) {
      // 如果未启用报告功能，直接返回成功
      return true;
    }

    const client = await getAkismetClient();
    if (!client) {
      // 如果 Akismet 未启用或配置无效，返回失败
      return false;
    }

    await client.submitSpam({
      user_ip: comment.userIp,
      user_agent: comment.userAgent,
      referrer: comment.referrer,
      permalink: comment.permalink,
      comment_type: comment.commentType || "comment",
      comment_author: comment.commentAuthor,
      comment_author_email: comment.commentAuthorEmail,
      comment_author_url: comment.commentAuthorUrl,
      comment_content: comment.commentContent,
      comment_date_gmt: comment.commentDateGmt?.toISOString(),
      comment_post_modified_gmt: comment.commentPostModifiedGmt?.toISOString(),
      user_role: comment.userRole,
      is_test: comment.isTest || false,
    });

    console.log("已向 Akismet 提交垃圾评论");
    return true;
  } catch (error) {
    console.error("向 Akismet 提交垃圾评论失败:", error);
    return false;
  }
}

/**
 * 向 Akismet 提交正常评论（管理员取消垃圾标记）
 * @param comment 评论数据
 * @returns 是否提交成功
 */
export async function submitHam(comment: CommentData): Promise<boolean> {
  try {
    const reportEnabled = await getConfig("comment.akismet.report.enable");
    if (!reportEnabled) {
      // 如果未启用报告功能，直接返回成功
      return true;
    }

    const client = await getAkismetClient();
    if (!client) {
      // 如果 Akismet 未启用或配置无效，返回失败
      return false;
    }

    await client.submitHam({
      user_ip: comment.userIp,
      user_agent: comment.userAgent,
      referrer: comment.referrer,
      permalink: comment.permalink,
      comment_type: comment.commentType || "comment",
      comment_author: comment.commentAuthor,
      comment_author_email: comment.commentAuthorEmail,
      comment_author_url: comment.commentAuthorUrl,
      comment_content: comment.commentContent,
      comment_date_gmt: comment.commentDateGmt?.toISOString(),
      comment_post_modified_gmt: comment.commentPostModifiedGmt?.toISOString(),
      user_role: comment.userRole,
      is_test: comment.isTest || false,
    });

    console.log("已向 Akismet 提交正常评论");
    return true;
  } catch (error) {
    console.error("向 Akismet 提交正常评论失败:", error);
    return false;
  }
}

/**
 * 检查 Akismet 是否已启用且配置有效
 * @returns 是否启用
 */
export async function isAkismetEnabled(): Promise<boolean> {
  const client = await getAkismetClient();
  return client !== null;
}
