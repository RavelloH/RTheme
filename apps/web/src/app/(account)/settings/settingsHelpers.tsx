import type { OAuthProvider } from "@/lib/server/oauth";
import {
  RiGoogleFill,
  RiGithubFill,
  RiMicrosoftFill,
  RiWindowsFill,
  RiAppleFill,
  RiAndroidFill,
  RiTerminalBoxFill,
  RiComputerLine,
} from "@remixicon/react";

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (dateString: string | null): string => {
  if (!dateString) return "未知";

  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;

  // 超过 30 天显示具体日期
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * 获取设备图标
 */
export const getDeviceIcon = (iconName: string) => {
  switch (iconName) {
    case "RiWindowsFill":
      return <RiWindowsFill size="1.5em" />;
    case "RiAppleFill":
      return <RiAppleFill size="1.5em" />;
    case "RiAndroidFill":
      return <RiAndroidFill size="1.5em" />;
    case "RiTerminalBoxFill":
      return <RiTerminalBoxFill size="1.5em" />;
    case "RiComputerLine":
    default:
      return <RiComputerLine size="1.5em" />;
  }
};

/**
 * 获取 OAuth 提供商名称
 */
export const getProviderName = (provider: OAuthProvider): string => {
  switch (provider) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    case "microsoft":
      return "Microsoft";
    default:
      return provider;
  }
};

/**
 * 获取 OAuth 提供商图标
 */
export const getProviderIcon = (provider: OAuthProvider) => {
  switch (provider) {
    case "google":
      return <RiGoogleFill size="1.5em" />;
    case "github":
      return <RiGithubFill size="1.5em" />;
    case "microsoft":
      return <RiMicrosoftFill size="1.5em" />;
  }
};
