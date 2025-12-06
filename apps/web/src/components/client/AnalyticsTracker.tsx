"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/actions/analytics";

const VISITOR_ID_KEY = "visitor_id";

/**
 * 生成访客 ID
 */
function generateVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * 获取或生成访客 ID
 */
function getVisitorId(): string {
  if (typeof window === "undefined") return "";

  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = generateVisitorId();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch {
    // localStorage 不可用时，使用临时 ID
    return generateVisitorId();
  }
}

/**
 * 收集客户端信息
 */
function collectClientInfo() {
  if (typeof window === "undefined") {
    return {
      screenSize: null,
      language: null,
      timezone: null,
    };
  }

  const screenSize = `${window.screen.width}x${window.screen.height}`;
  const language = navigator.language || null;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;

  return {
    screenSize,
    language,
    timezone,
  };
}

/**
 * Analytics 追踪组件
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // 忽略 hash 变化（pathname 不包含 hash）
    if (lastPathRef.current === pathname) return;

    lastPathRef.current = pathname;

    const visitorId = getVisitorId();
    if (!visitorId) return;

    const { screenSize, language, timezone } = collectClientInfo();

    const referer =
      typeof document !== "undefined" ? document.referrer || null : null;

    // 调用 server action 追踪访问
    trackPageView({
      path: pathname,
      referer,
      visitorId,
      screenSize,
      language,
      timezone,
    }).catch((error) => {
      // 静默失败，不影响用户体验
      console.debug("Analytics tracking failed:", error);
    });
  }, [pathname]);

  return null;
}
