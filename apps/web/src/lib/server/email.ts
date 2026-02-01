import "server-only";

import { randomInt } from "crypto";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { Resend } from "resend";

import { getConfig, getConfigs } from "@/lib/server/config-cache";

// 验证码相关常量
const MAX_VERIFY_DURATION = 15 * 60 * 1000; // 15分钟

// ============================================
// 验证码工具函数
// ============================================

/**
 * 生成验证码（6位数字 + 时间戳）
 * 使用 crypto.randomInt 确保密码学安全性
 */
function generate(): string {
  // 使用密码学安全的随机数生成器
  const code = randomInt(100000, 1000000).toString();
  const timestamp = Date.now();
  return code + "-" + timestamp;
}

/**
 * 验证验证码是否有效
 */
function verify(inputCode: string, storedCodeWithTimestamp: string): boolean {
  try {
    const [storedCode, timestampStr] = storedCodeWithTimestamp.split("-");
    const timestamp = parseInt(timestampStr || "", 10);

    return (
      storedCode === inputCode &&
      !isNaN(timestamp) &&
      Date.now() - timestamp <= MAX_VERIFY_DURATION
    );
  } catch {
    return false;
  }
}

// ============================================
// 邮件配置接口
// ============================================

/**
 * SMTP 配置接口
 */
interface SMTPConfig {
  user: string;
  host: string;
  port: string;
  tls: boolean;
  password: string;
}

/**
 * 邮件配置接口
 */
interface EmailConfig {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  resendApiKey?: string;
  smtp?: SMTPConfig;
}

/**
 * 邮件发送选项
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/**
 * 邮件发送结果
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// 邮件配置获取
// ============================================

/**
 * 获取邮件配置
 */
async function getEmailConfig(): Promise<EmailConfig> {
  const [
    enabled,
    fromEmail,
    fromName,
    replyTo,
    resendApiKey,
    smtpConfig,
    siteTitle,
  ] = await getConfigs([
    "notice.enable",
    "notice.email",
    "notice.email.from.name",
    "notice.email.replyTo",
    "notice.email.resend.apiKey",
    "notice.email.smtp",
    "site.title",
  ]);

  // 如果没有配置发件人名称，使用站点标题
  const finalFromName = fromName || (siteTitle as string) || "NeutralPress";

  return {
    enabled: enabled && !!fromEmail,
    fromEmail: fromEmail || "",
    fromName: finalFromName,
    replyTo: replyTo || fromEmail || "",
    resendApiKey: resendApiKey || undefined,
    smtp: smtpConfig,
  };
}

// ============================================
// 邮件发送实现
// ============================================

let resendClient: Resend | null = null;
let smtpTransporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

/**
 * 获取或创建 Resend 客户端
 */
function getResendClient(apiKey: string): Resend {
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * 获取或创建 SMTP 传输器
 */
function getSMTPTransporter(
  config: SMTPConfig,
): Transporter<SMTPTransport.SentMessageInfo> {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port, 10),
      secure: config.tls,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }
  return smtpTransporter;
}

/**
 * 使用 Resend 发送邮件
 */
async function sendViaResend(
  config: EmailConfig,
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  try {
    if (!config.resendApiKey) {
      return {
        success: false,
        error: "未配置 Resend API Key",
      };
    }

    const resend = getResendClient(config.resendApiKey);

    // 构建发件人地址
    const from = `${config.fromName} <${config.fromEmail}>`;

    // 获取站点标题作为主题前缀
    const siteTitle = await getConfig("site.title");
    const subjectPrefix = siteTitle ? `[${siteTitle}] ` : "";

    const result = await resend.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: subjectPrefix + options.subject,
      ...(options.html ? { html: options.html } : {}),
      ...(options.text ? { text: options.text } : {}),
      replyTo: options.replyTo || config.replyTo,
    } as Parameters<typeof resend.emails.send>[0]);

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Resend 发送邮件失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 使用 SMTP 发送邮件
 */
async function sendViaSMTP(
  config: EmailConfig,
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  try {
    if (!config.smtp) {
      return {
        success: false,
        error: "未配置 SMTP",
      };
    }

    const transporter = getSMTPTransporter(config.smtp);

    // 构建发件人地址
    const from = `${config.fromName} <${config.fromEmail}>`;

    // 获取站点标题作为主题前缀
    const siteTitle = await getConfig("site.title");
    const subjectPrefix = siteTitle ? `[${siteTitle}] ` : "";

    const result = await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: subjectPrefix + options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || config.replyTo,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("SMTP 发送邮件失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 发送邮件（主函数）
 * 优先使用 Resend，如果未配置则使用 SMTP
 *
 * @param options 邮件发送选项
 * @returns 发送结果
 *
 * @example
 * // 发送 HTML 邮件
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: '欢迎注册',
 *   html: '<h1>欢迎！</h1><p>感谢您的注册。</p>',
 *   text: '欢迎！感谢您的注册。'
 * });
 *
 * @example
 * // 使用 React Email 组件
 * import { render } from '@react-email/render';
 * import WelcomeEmail from './emails/WelcomeEmail';
 *
 * const html = await render(<WelcomeEmail name="张三" />);
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: '欢迎注册',
 *   html,
 *   text: '欢迎注册！'
 * });
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  // 获取邮件配置
  const config = await getEmailConfig();

  // 检查邮件功能是否启用
  if (!config.enabled) {
    return {
      success: false,
      error: "邮件通知功能未启用",
    };
  }

  // 检查必要参数
  if (!options.to || (!options.html && !options.text)) {
    return {
      success: false,
      error: "缺少必要参数：收件人或邮件内容",
    };
  }

  // 优先使用 Resend
  if (config.resendApiKey) {
    return sendViaResend(config, options);
  }

  // 使用 SMTP
  if (config.smtp) {
    return sendViaSMTP(config, options);
  }

  return {
    success: false,
    error: "未配置邮件发送服务（Resend 或 SMTP）",
  };
}

// ============================================
// 导出工具函数
// ============================================

const emailUtils = {
  generate,
  verify,
  sendEmail,
};

export default emailUtils;
