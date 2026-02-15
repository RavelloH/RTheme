import "server-only";

import { cookies } from "next/headers";

import { authVerify } from "@/lib/server/auth-verify";
import { getConfigs } from "@/lib/server/config-cache";
import prisma from "@/lib/server/prisma";

export interface SubscribeContext {
  mailSubscriptionEnabled: boolean;
  mailSubscriptionAnonymousEnabled: boolean;
  mailSubscriptionCheckEnabled: boolean;
  currentUser: {
    uid: number;
    email: string;
    emailVerified: boolean;
  } | null;
}

function unwrapDefaultValue(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 4; i += 1) {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      "default" in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>).default;
      continue;
    }
    break;
  }
  return current;
}

function toBoolean(value: unknown): boolean {
  const normalized = unwrapDefaultValue(value);
  if (typeof normalized === "boolean") {
    return normalized;
  }
  if (typeof normalized === "string") {
    const text = normalized.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(text)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(text)) {
      return false;
    }
  }
  if (typeof normalized === "number") {
    return normalized !== 0;
  }
  return false;
}

function toOptionalString(value: unknown): string {
  const normalized = unwrapDefaultValue(value);
  if (typeof normalized === "string") {
    return normalized.trim();
  }
  if (typeof normalized === "number") {
    return String(normalized);
  }
  return "";
}

function hasValidSmtpConfig(value: unknown): boolean {
  const normalized = unwrapDefaultValue(value);
  if (!normalized || typeof normalized !== "object") {
    return false;
  }

  const smtp = normalized as {
    user?: unknown;
    host?: unknown;
    port?: unknown;
    password?: unknown;
  };

  const user = toOptionalString(smtp.user);
  const host = toOptionalString(smtp.host);
  const port = toOptionalString(smtp.port);
  const password = toOptionalString(smtp.password);

  return !!(user && host && port && password);
}

export async function getSubscribeContext(): Promise<SubscribeContext> {
  const [
    mailSubscriptionEnabled,
    mailSubscriptionAnonymousEnabled,
    mailSubscriptionCheckEnabled,
    noticeEnabled,
    noticeEmail,
    noticeEmailResendApiKey,
    noticeEmailSmtp,
  ] = await getConfigs([
    "notice.mailSubscription.enable",
    "notice.mailSubscription.anonymous.enable",
    "notice.mailSubscription.check.enable",
    "notice.enable",
    "notice.email",
    "notice.email.resend.apiKey",
    "notice.email.smtp",
  ]);

  const mailDeliveryAvailable =
    toBoolean(noticeEnabled) &&
    toOptionalString(noticeEmail).length > 0 &&
    (toOptionalString(noticeEmailResendApiKey).length > 0 ||
      hasValidSmtpConfig(noticeEmailSmtp));
  const finalMailSubscriptionAnonymousEnabled = toBoolean(
    mailSubscriptionAnonymousEnabled,
  );
  const finalMailSubscriptionCheckEnabled = toBoolean(
    mailSubscriptionCheckEnabled,
  );
  const finalMailSubscriptionEnabled =
    toBoolean(mailSubscriptionEnabled) && mailDeliveryAvailable;

  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value;
  const user = token
    ? await authVerify({
        allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
        accessToken: token,
      })
    : null;

  if (!user) {
    return {
      mailSubscriptionEnabled: finalMailSubscriptionEnabled,
      mailSubscriptionAnonymousEnabled: finalMailSubscriptionAnonymousEnabled,
      mailSubscriptionCheckEnabled: finalMailSubscriptionCheckEnabled,
      currentUser: null,
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { uid: user.uid },
    select: {
      uid: true,
      email: true,
      emailVerified: true,
    },
  });

  return {
    mailSubscriptionEnabled: finalMailSubscriptionEnabled,
    mailSubscriptionAnonymousEnabled: finalMailSubscriptionAnonymousEnabled,
    mailSubscriptionCheckEnabled: finalMailSubscriptionCheckEnabled,
    currentUser: dbUser
      ? {
          uid: dbUser.uid,
          email: dbUser.email,
          emailVerified: dbUser.emailVerified,
        }
      : null,
  };
}
