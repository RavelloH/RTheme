import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import type { ReactNode } from "react";
import {
  Code,
  Home,
  Info,
  Rocket,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import { GithubInfo } from "fumadocs-ui/components/github-info";

export default function Layout({ children }: { children: ReactNode }) {
  const base = baseOptions();
  return (
    <DocsLayout
      {...base}
      tree={source.getPageTree()}
      sidebar={{
        defaultOpenLevel: 1,
      }}
      links={[
        {
          type: "main",
          text: "首页",
          url: "/",
          icon: <Home />,
        },
        {
          type: "main",
          text: "简介",
          url: "/docs",
          icon: <Info />,
        },
        {
          type: "custom",
          children: (
            <GithubInfo
              owner="RavelloH"
              repo="RTheme"
              className="flex justify-between"
            />
          ),
        },
        {
          type: "custom",
          children: <hr className="my-2" />,
        },
        {
          type: "main",
          text: "特色功能",
          url: "/docs/feature",
          icon: <Sparkles />,
        },
        {
          type: "main",
          text: "部署指南",
          url: "/docs/deploy",
          icon: <Rocket />,
        },
        {
          type: "main",
          text: "配置指南",
          url: "/docs/settings",
          icon: <Settings />,
        },
        {
          type: "main",
          text: "开发文档",
          url: "/docs/dev",
          icon: <Code />,
        },
        {
          type: "main",
          text: "API 文档",
          url: "/docs/api",
          icon: <Send />,
        },
      ]}
      nav={{
        ...base.nav,
        enabled: true,
        transparentMode: "top",
      }}
    >
      {children}
    </DocsLayout>
  );
}
