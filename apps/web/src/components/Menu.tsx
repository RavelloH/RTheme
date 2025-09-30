"use client";

import Link from "./Link";
import { motion } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ArrowUpRight } from "lucide-react";
import type { MenuItem } from "@/lib/server/menuCache";
import { useConfig } from "@/components/ConfigProvider";
import { useMobile } from "@/hooks/useMobile";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";

// 使用 menuCache 中的 MenuItem 类型
type MenuType = MenuItem;

interface MenuProps {
  setIsMenuOpen: (open: boolean) => void;
  menus: MenuType[];
}

// 动态图标组件 - 使用 Lucide React 真正的按需加载
function DynamicIcon({ iconName }: { iconName: string }) {
  const [IconComponent, setIconComponent] = useState<LucideIcon | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!iconName) {
      setError(true);
      return;
    }

    // Lucide 图标使用 PascalCase 命名
    // 将 kebab-case 转换为 PascalCase
    const pascalCaseName = iconName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    // 动态导入图标 - Lucide 支持更好的 tree-shaking
    import("lucide-react")
      .then((iconModule) => {
        const icon = (iconModule as unknown as Record<string, LucideIcon>)[
          pascalCaseName
        ];
        if (icon) {
          setIconComponent(() => icon);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        setError(true);
      });
  }, [iconName]);

  if (error) {
    return (
      <span className="text-xs bg-red-100 text-red-600 px-1 rounded">
        {iconName}
      </span>
    );
  }

  if (!IconComponent) {
    // 加载中状态 - 显示一个占位符
    return <span className="inline-block w-5 h-5"></span>;
  }

  return <IconComponent className="w-5 h-5" />;
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
                      {menu.icon && <DynamicIcon iconName={menu.icon} />}
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
                      {menu.icon && <DynamicIcon iconName={menu.icon} />}
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
                        {menu.icon && <DynamicIcon iconName={menu.icon} />}
                        <span>{menu.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        <ArrowUpRight className="w-6 h-6" />
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
