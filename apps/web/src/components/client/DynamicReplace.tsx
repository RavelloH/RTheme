"use client";

import { formatRelativeTime } from "@/lib/shared/relative-time";
import { useEffect, useState } from "react";

interface DynamicReplaceProps {
  text: string;
  params?: [string, string][];
}

export default function DynamicReplace({
  text,
  params,
}: DynamicReplaceProps): React.ReactElement {
  const [processedText, setProcessedText] = useState(() => {
    return replacePlaceholders(text, params);
  });

  // 检查是否需要动态更新（包含时间相关的占位符）
  const needsDynamicUpdate =
    text.includes("{lastPublishDays}") || text.includes("{lastUpdatedDays}");

  useEffect(() => {
    if (!needsDynamicUpdate) return;

    // 设置定时器每分钟更新一次时间相关内容
    const interval = setInterval(() => {
      setProcessedText(replacePlaceholders(text, params));
    }, 60000); // 每分钟更新

    return () => clearInterval(interval);
  }, [text, params, needsDynamicUpdate]);

  function replacePlaceholders(
    content: string,
    replacements?: [string, string][],
  ): string {
    let result = content || "";

    // 处理参数替换
    if (replacements) {
      for (const [placeholder, value] of replacements) {
        result = result.replaceAll(placeholder, value);
      }
    }

    // 处理 {lastPublishDays} 时间占位符
    if (result.includes("{lastPublishDays}")) {
      // 尝试从参数中获取日期，如果没有则使用当前时间
      const dateParam = replacements?.find(([key]) => key === "__date");
      const targetDate = dateParam ? new Date(dateParam[1]) : new Date();
      result = result.replaceAll(
        "{lastPublishDays}",
        formatRelativeTime(targetDate),
      );
    }

    // 处理 {lastUpdatedDays} 时间占位符
    if (result.includes("{lastUpdatedDays}")) {
      // 尝试从参数中获取日期，如果没有则使用当前时间
      const dateParam = replacements?.find(([key]) => key === "__date");
      const targetDate = dateParam ? new Date(dateParam[1]) : new Date();
      result = result.replaceAll(
        "{lastUpdatedDays}",
        formatRelativeTime(targetDate),
      );
    }

    return result;
  }

  return <div>{processedText}</div>;
}
