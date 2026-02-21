import { baseOptions } from "@/lib/layout.shared";
import type { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import {
  NavbarMenu,
  NavbarMenuContent,
  NavbarMenuLink,
  NavbarMenuTrigger,
} from "fumadocs-ui/layouts/home/navbar";
import { SmoothScroll } from "./_components/smooth-scroll";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <HomeLayout
        {...baseOptions()}
        links={[
          {
            type: "custom",
            on: "nav",
            children: (
              <NavbarMenu>
                <NavbarMenuTrigger>文档</NavbarMenuTrigger>
                <NavbarMenuContent>
                  <NavbarMenuLink href="/docs">简介</NavbarMenuLink>
                  <NavbarMenuLink href="/docs/feature">特色功能</NavbarMenuLink>
                  <NavbarMenuLink href="/docs/deploy">部署指南</NavbarMenuLink>
                  <NavbarMenuLink href="/docs/settings">
                    配置指南
                  </NavbarMenuLink>
                  <NavbarMenuLink href="/docs/dev">开发文档</NavbarMenuLink>
                  <NavbarMenuLink href="/docs/api">API 文档</NavbarMenuLink>
                </NavbarMenuContent>
              </NavbarMenu>
            ),
          },
          {
            text: "演示",
            url: "https://ravelloh.com",
            external: true,
          },
        ]}
      >
        {children}
      </HomeLayout>
    </SmoothScroll>
  );
}
