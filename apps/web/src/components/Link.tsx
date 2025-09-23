"use client";

import { useBroadcast } from "@/hooks/useBroadcast";
import { useMenu } from "@/components/MenuProvider";
import { default as NextLink } from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import React from "react";
import type { MenuItem } from "@/lib/server/menuCache";

interface CustomLinkProps extends React.ComponentProps<typeof NextLink> {
  children: React.ReactNode;
}

function jumpTransition(
  oldPath: string,
  newPath: string,
  router: ReturnType<typeof useRouter>,
  broadcastStore: ReturnType<typeof useBroadcast<object>>,
  getLeftRightMenus: (currentPath: string) => {
    leftMenus: MenuItem[];
    rightMenus: MenuItem[];
    hasHomeOnLeft: boolean;
    isMainMenu: boolean;
    menuCategory: string;
    categoryIndex: number;
  },
) {
  // 如果是锚点链接，修改页面的锚点
  if (newPath.startsWith("#")) {
    const anchor = document.querySelector(newPath);
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth" });
    }
    return;
  }

  if (newPath.startsWith("http")) {
    window.open(newPath, "_blank");
    return;
  }

  if (newPath.startsWith("mailto:")) {
    window.location.href = newPath;
    return;
  }

  if (!newPath.startsWith("/")) {
    newPath = oldPath.endsWith("/")
      ? oldPath + newPath
      : oldPath + "/" + newPath;
  }

  // 如果是同一路径，直接返回
  if (oldPath === newPath) {
    router.refresh();
    return;
  }

  console.log(`Navigating from ${oldPath} to ${newPath}`);

  // 上下层级关系判断
  if (oldPath.split("/").length === newPath.split("/").length) {
    // 平级导航，判断左右方向
    const oldMenuInfo = getLeftRightMenus(oldPath);
    const newMenuInfo = getLeftRightMenus(newPath);

    const {
      leftMenus,
      rightMenus,
      hasHomeOnLeft,
      isMainMenu: oldIsMainMenu,
      menuCategory: oldMenuCategory,
    } = oldMenuInfo;

    const { isMainMenu: newIsMainMenu, menuCategory: newMenuCategory } =
      newMenuInfo;

    const targetSlug = newPath.replace(/^\//, "");

    // 检查目标页面是否在左侧菜单中
    const isLeft = leftMenus.some((menu) => menu.slug === targetSlug);

    // 检查目标页面是否在右侧菜单中
    const isRight = rightMenus.some((menu) => menu.slug === targetSlug);

    // 检查是否是首页（首页总是在左侧）
    const isHome = targetSlug === "" || newPath === "/";

    // MAIN 菜单向其他菜单导航
    if (oldIsMainMenu && !newIsMainMenu) {
      console.log("→");
      broadcastStore.getState().broadcast({
        type: "page-transition",
        direction: "right",
      });
    }
    // 其他菜单向 MAIN 菜单导航
    else if (!oldIsMainMenu && newIsMainMenu) {
      console.log("←");
      broadcastStore.getState().broadcast({
        type: "page-transition",
        direction: "left",
      });
    }
    // 同类别菜单内的导航（包括 MAIN、COMMON、OUTSITE）
    else if (
      oldMenuCategory === newMenuCategory &&
      oldMenuCategory !== "UNKNOWN"
    ) {
      if (isLeft || (isHome && hasHomeOnLeft)) {
        console.log("←");
        broadcastStore.getState().broadcast({
          type: "page-transition",
          direction: "left",
        });
      } else if (isRight) {
        console.log("→");
        broadcastStore.getState().broadcast({
          type: "page-transition",
          direction: "right",
        });
      } else {
        console.log("←→");
      }
    }
    // 不同类别之间的非 MAIN 菜单导航
    else if (
      !oldIsMainMenu &&
      !newIsMainMenu &&
      oldMenuCategory !== newMenuCategory
    ) {
      console.log("←→");
    }
    // 从首页到任何页面
    else if (oldPath === "/" && newPath.startsWith("/")) {
      console.log("→");
      broadcastStore.getState().broadcast({
        type: "page-transition",
        direction: "right",
      });
    } else {
      console.log("←→");
    }
  }
  if (oldPath.split("/").length > newPath.split("/").length) {
    broadcastStore.getState().broadcast({
      type: "page-transition",
      direction: "up",
    });
    console.log("↑");
  }
  if (oldPath.split("/").length < newPath.split("/").length) {
    console.log("↓");
    broadcastStore.getState().broadcast({
      type: "page-transition",
      direction: "down",
    });
  }
}

export default function Link({ children, ...props }: CustomLinkProps) {
  const router = useRouter();
  // 获取当前路径
  const pathname = usePathname();
  const broadcastStore = useBroadcast<object>();
  const { getLeftRightMenus } = useMenu();

  return (
    <NextLink
      {...props}
      onNavigate={(e) => {
        jumpTransition(
          pathname,
          props.href.toString(),
          router,
          broadcastStore,
          getLeftRightMenus,
        );
        e.preventDefault();
      }}
    >
      {children}
    </NextLink>
  );
}
