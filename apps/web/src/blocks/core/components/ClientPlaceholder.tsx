"use client";

import { useMemo } from "react";

export interface ClientPlaceholderProps {
  type: "relative-time";
  data: string; // ISO 时间字符串
}

/**
 * 客户端占位符组件
 * 用于处理需要客户端计算的占位符，如相对时间
 */
export function ClientPlaceholder({ type, data }: ClientPlaceholderProps) {
  if (type === "relative-time") {
    return <RelativeTime date={new Date(data)} />;
  }
  return null;
}

/**
 * 相对时间组件
 * 将日期转换为"刚刚"、"X天前"等相对时间描述
 */
function RelativeTime({ date }: { date: Date }) {
  const text = useMemo(() => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    if (weeks < 4) return `${weeks} 周前`;
    if (months < 12) return `${months} 个月前`;
    return `${years} 年前`;
  }, [date]);

  return <span>{text}</span>;
}
