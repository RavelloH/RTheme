"use client";

import Link from "./Link";
import { motion } from "framer-motion";
import Marquee from "react-fast-marquee";
import * as RemixIcon from "@remixicon/react";
import type { MenuItem } from "@/lib/server/menuCache";
import { useConfig } from "@/components/ConfigProvider";
import { useMobile } from "@/hooks/useMobile";

// 使用 menuCache 中的 MenuItem 类型
type MenuType = MenuItem;

interface MenuProps {
  setIsMenuOpen: (open: boolean) => void;
  menus: MenuType[];
}

// 图标名称到组件的映射函数
function getIconComponent(iconName: string) {
  if (!iconName) return null;

  // 改进的图标名称解析 - 保留数字和连字符
  const cleanIconName = iconName.replace(/[^a-zA-Z0-9-]/g, "");
  if (!cleanIconName) return null;

  // 构建可能的组件名称
  const parts = cleanIconName.split("-");
  if (parts.length === 0) return null;

  // 构建组件名
  let componentName =
    "Ri" + parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1) || "";

  // 处理剩余部分
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part === "fill" && i === parts.length - 1) {
      // 最后一个部分是 fill，不添加 Fill 后缀，因为 RemixIcon 组件名本身就有 Fill
      continue;
    }
    componentName += part.charAt(0).toUpperCase() + part.slice(1);
  }

  // 如果没有 fill 后缀，尝试 Line 版本
  const finalComponentName = cleanIconName.endsWith("-fill")
    ? componentName + "Fill"
    : componentName + "Line";

  // 尝试访问组件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicIcon = (RemixIcon as Record<string, React.ComponentType<any>>)[
    finalComponentName
  ];

  return dynamicIcon || null;
}

export default function Menu({ setIsMenuOpen, menus }: MenuProps) {
  const { config } = useConfig();
  const isMobile = useMobile();

  const handleMenuClick = (menu: MenuType) => {
    if (menu.link) {
      window.open(menu.link, "_blank", "noopener,noreferrer");
    } else {
      setIsMenuOpen(false);
    }
  };

  const mainMenus = menus.filter(
    (menu) => menu.category === "MAIN" && menu.status === "ACTIVE",
  );
  const commonMenus = menus.filter(
    (menu) => menu.category === "COMMON" && menu.status === "ACTIVE",
  );
  const outsiteMenus = menus.filter(
    (menu) => menu.category === "OUTSITE" && menu.status === "ACTIVE",
  );

  return (
    <motion.div
      className="w-full h-full flex flex-col bg-background"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 180,
        duration: 0.4,
      }}
    >
      <motion.div
        className="h-[78px] flex justify-center items-center w-full bg-primary text-primary-foreground"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <span>{`// ${config<string>("site.slogan.secondary")} //`}</span>
      </motion.div>

      <motion.div
        className="flex-1 w-full overflow-y-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-full h-[25%] text-5xl border-y border-border">
          <Marquee speed={40} autoFill={true} className="h-full text-7xl">
            <span>{config<string>("site.title")}</span>
            <span>&nbsp;&nbsp;/&nbsp;&nbsp;</span>
          </Marquee>
        </div>

        <motion.div
          className="p-6 overflow-y-auto h-[calc(100%-25%)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className={isMobile ? "space-y-8" : "grid grid-cols-3 gap-6 h-full"}
          >
            {/* 第一个div - 主要导航 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                主要导航
              </h3>
              <div className="grid grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden">
                {mainMenus.map((menu, index) => (
                  <motion.div
                    key={menu.id}
                    className="relative w-full overflow-hidden group "
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.4 + index * 0.08,
                      type: "spring",
                      damping: 20,
                      stiffness: 200,
                    }}
                  >
                    <div className="absolute inset-0 bg-accent z-0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] origin-left" />
                    <Link
                      href={
                        menu.link ||
                        (menu.slug
                          ? `/${menu.slug}`
                          : menu.page?.slug
                            ? `/${menu.page.slug}`
                            : "#")
                      }
                      target={menu.link ? "_blank" : undefined}
                      rel={menu.link ? "noopener noreferrer" : undefined}
                      onClick={() => handleMenuClick(menu)}
                      className="w-full text-left p-3 flex items-center space-x-3 relative z-10 bg-transparent"
                    >
                      {menu.icon &&
                        (() => {
                          const IconComponent = getIconComponent(menu.icon);
                          if (!IconComponent) {
                            return (
                              <span className="text-xs bg-red-100 text-red-600 px-1 rounded">
                                {menu.icon}
                              </span>
                            );
                          }
                          return (
                            <span className="text-lg">
                              <IconComponent />
                            </span>
                          );
                        })()}
                      <span>{menu.name}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 第二个div - 常用链接 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                常用链接
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {commonMenus.map((menu, index) => (
                  <motion.div
                    key={menu.id}
                    className="relative w-full overflow-hidden group"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.4 + index * 0.08,
                      type: "spring",
                      damping: 20,
                      stiffness: 200,
                    }}
                  >
                    <div className="absolute inset-0 bg-accent z-0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] origin-left" />
                    <Link
                      href={
                        menu.link ||
                        (menu.slug
                          ? `/${menu.slug}`
                          : menu.page?.slug
                            ? `/${menu.page.slug}`
                            : "#")
                      }
                      target={menu.link ? "_blank" : undefined}
                      rel={menu.link ? "noopener noreferrer" : undefined}
                      onClick={() => handleMenuClick(menu)}
                      className="w-full text-left p-3 flex items-center space-x-3 relative z-10 bg-transparent"
                    >
                      {menu.icon &&
                        (() => {
                          const IconComponent = getIconComponent(menu.icon);
                          if (!IconComponent) {
                            return (
                              <span className="text-xs bg-red-100 text-red-600 px-1 rounded">
                                {menu.icon}
                              </span>
                            );
                          }
                          return (
                            <span className="text-lg">
                              <IconComponent />
                            </span>
                          );
                        })()}
                      <span>{menu.name}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 第三个div - 外部链接 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                外部链接
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {outsiteMenus.map((menu, index) => (
                  <motion.div
                    key={menu.id}
                    className="relative w-full overflow-hidden group"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.4 + index * 0.08,
                      type: "spring",
                      damping: 20,
                      stiffness: 200,
                    }}
                  >
                    <div className="absolute inset-0 bg-accent z-0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] origin-left" />
                    <Link
                      href={
                        menu.link ||
                        (menu.slug
                          ? `/${menu.slug}`
                          : menu.page?.slug
                            ? `/${menu.page.slug}`
                            : "#")
                      }
                      target={menu.link ? "_blank" : undefined}
                      rel={menu.link ? "noopener noreferrer" : undefined}
                      onClick={() => handleMenuClick(menu)}
                      className="w-full text-left p-3 flex items-center justify-between relative z-10 bg-transparent"
                    >
                      <div className="flex items-center space-x-3">
                        {menu.icon &&
                          (() => {
                            const IconComponent = getIconComponent(menu.icon);
                            if (!IconComponent) {
                              return (
                                <span className="text-xs bg-red-100 text-red-600 px-1 rounded">
                                  {menu.icon}
                                </span>
                              );
                            }
                            return (
                              <span className="text-lg">
                                <IconComponent />
                              </span>
                            );
                          })()}
                        <span>{menu.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        <RemixIcon.RiArrowRightUpLongLine size={"1.5em"} />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="py-4 flex justify-center items-center w-full text-muted-foreground text-sm border-t border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <span>
          Copyright ©{" "}
          {(() => {
            const startYear = new Date(
              config<string>("site.birthday"),
            ).getFullYear();
            const currentYear = new Date().getFullYear();
            return startYear === currentYear
              ? startYear
              : `${startYear} - ${currentYear}`;
          })()}{" "}
          {config<string>("site.author")}.
        </span>
        {config<Array<string>>("site.copyright").map((line, idx) => (
          <span key={idx}>
            <span className="px-2">/</span>
            <span dangerouslySetInnerHTML={{ __html: line }}></span>
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}
