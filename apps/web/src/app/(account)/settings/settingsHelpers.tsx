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
