"use client";

import React, { createContext, useContext } from "react";
import type { MenuItem } from "@/lib/server/menuCache";

interface MenuContextType {
  menus: MenuItem[];
  getMenuByPath: (path: string) => MenuItem | null;
  getLeftRightMenus: (currentPath: string) => {
    leftMenus: MenuItem[];
    rightMenus: MenuItem[];
    hasHomeOnLeft: boolean;
    isMainMenu: boolean;
    menuCategory: string;
    categoryIndex: number;
  };
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({
  children,
  menus,
}: {
  children: React.ReactNode;
  menus: MenuItem[];
}) {
  const getMenuByPath = (path: string): MenuItem | null => {
    return (
      menus.find((menu) => {
        if (menu.link) return false;
        const menuPath = menu.slug
          ? `/${menu.slug}`
          : menu.page?.slug
            ? `/${menu.page.slug}`
            : "#";
        return menuPath === path;
      }) || null
    );
  };

  const getLeftRightMenus = (currentPath: string) => {
    const activeMainMenus = menus.filter(
      (menu) =>
        menu.category === "MAIN" && menu.status === "ACTIVE" && !menu.link,
    );

    const activeCommonMenus = menus.filter(
      (menu) =>
        menu.category === "COMMON" && menu.status === "ACTIVE" && !menu.link,
    );

    const activeOutsiteMenus = menus.filter(
      (menu) =>
        menu.category === "OUTSITE" && menu.status === "ACTIVE" && !menu.link,
    );

    // 处理首页情况
    if (currentPath === "/") {
      return {
        leftMenus: [],
        rightMenus: activeMainMenus,
        hasHomeOnLeft: false,
        isMainMenu: true,
        menuCategory: "MAIN",
        categoryIndex: -1,
      };
    }

    // 检查是否是 MAIN 菜单
    const mainIndex = activeMainMenus.findIndex((menu) => {
      const menuPath = menu.slug
        ? `/${menu.slug}`
        : menu.page?.slug
          ? `/${menu.page.slug}`
          : "#";
      return menuPath === currentPath;
    });

    if (mainIndex !== -1) {
      // 是 MAIN 菜单
      const leftMenus = activeMainMenus.slice(0, mainIndex);
      const rightMenus = activeMainMenus.slice(mainIndex + 1);

      return {
        leftMenus,
        rightMenus,
        hasHomeOnLeft: true,
        isMainMenu: true,
        menuCategory: "MAIN",
        categoryIndex: mainIndex,
      };
    }

    // 检查是否是 COMMON 菜单
    const commonIndex = activeCommonMenus.findIndex((menu) => {
      const menuPath = menu.slug
        ? `/${menu.slug}`
        : menu.page?.slug
          ? `/${menu.page.slug}`
          : "#";
      return menuPath === currentPath;
    });

    if (commonIndex !== -1) {
      // 是 COMMON 菜单
      const leftMenus = activeCommonMenus.slice(0, commonIndex);
      const rightMenus = activeCommonMenus.slice(commonIndex + 1);

      return {
        leftMenus,
        rightMenus,
        hasHomeOnLeft: true,
        isMainMenu: false,
        menuCategory: "COMMON",
        categoryIndex: commonIndex,
      };
    }

    // 检查是否是 OUTSITE 菜单
    const outsiteIndex = activeOutsiteMenus.findIndex((menu) => {
      const menuPath = menu.slug
        ? `/${menu.slug}`
        : menu.page?.slug
          ? `/${menu.page.slug}`
          : "#";
      return menuPath === currentPath;
    });

    if (outsiteIndex !== -1) {
      // 是 OUTSITE 菜单
      const leftMenus = activeOutsiteMenus.slice(0, outsiteIndex);
      const rightMenus = activeOutsiteMenus.slice(outsiteIndex + 1);

      return {
        leftMenus,
        rightMenus,
        hasHomeOnLeft: true,
        isMainMenu: false,
        menuCategory: "OUTSITE",
        categoryIndex: outsiteIndex,
      };
    }

    // 如果找不到页面，返回默认值
    return {
      leftMenus: [],
      rightMenus: activeMainMenus,
      hasHomeOnLeft: true,
      isMainMenu: false,
      menuCategory: "UNKNOWN",
      categoryIndex: -1,
    };
  };

  return (
    <MenuContext.Provider
      value={{
        menus,
        getMenuByPath,
        getLeftRightMenus,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}
