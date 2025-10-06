"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useMenuStore } from "@/store/menuStore";
import { useConsoleStore } from "@/store/consoleStore";
import { Panel } from "./Panel";
import { ConsoleButton } from "./ConsoleButton";
import { MenuItem } from "@/lib/server/menuCache";
import Link from "./Link";

interface FooterProps {
  menus: MenuItem[];
}

export default function FooterDesktop({ menus }: FooterProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const isMenuOpen = useMenuStore((state) => state.isMenuOpen);
  const { isConsoleOpen } = useConsoleStore();
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });
  const footerRef = useRef<HTMLElement>(null);
  const menuRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const underlineRef = useRef<HTMLSpanElement | null>(null);
  const previousPathname = useRef<string>(pathname);
  const isAnimating = useRef<boolean>(false);
  const [activePathname, setActivePathname] = useState<string>(pathname);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 监听加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoaded(true);

      // 使用GSAP动画从下方滑入
      if (footerRef.current) {
        gsap.fromTo(
          footerRef.current,
          { y: 78 },
          {
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.2, // 稍微延迟，让Header先动画
          },
        );
      }
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);

    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      // 延迟开始Footer动画，等待Header下降到合适位置
      const delay = 200; // 根据Header动画时长调整
      setTimeout(() => {
        setShouldAnimate(true);
      }, delay);
    } else {
      // 菜单关闭时立即重置
      setShouldAnimate(false);
    }
  }, [isMenuOpen]);

  // 菜单 hover 颜色动画处理
  const handleMenuHover = (index: number, isActive: boolean) => {
    const linkElement = menuRefs.current[index];
    if (!linkElement || isActive) return;

    gsap.to(linkElement, {
      color: "#ffffff",
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleMenuLeave = (index: number, isActive: boolean) => {
    const linkElement = menuRefs.current[index];
    if (!linkElement || isActive) return;

    gsap.to(linkElement, {
      color: "",
      duration: 0.3,
      ease: "power2.in",
    });
  };

  // 更新下划线位置的函数
  const updateUnderlinePosition = (activeIndex: number) => {
    const underline = underlineRef.current;
    const activeLink =
      activeIndex !== -1 ? menuRefs.current[activeIndex] : null;

    if (!underline) return;

    if (activeLink) {
      const rect = activeLink.getBoundingClientRect();
      const parentRect = underline.parentElement?.getBoundingClientRect();

      gsap.set(underline, {
        x: rect.left - (parentRect?.left || 0),
        width: rect.width,
        opacity: 1,
      });
    } else {
      gsap.set(underline, {
        opacity: 0,
      });
    }
  };

  // 创建单个下划线移动动画
  const createUnderlineAnimation = (fromIndex: number, toIndex: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const tl = gsap.timeline();
    const underline = underlineRef.current;

    if (!underline) {
      isAnimating.current = false;
      setActivePathname(previousPathname.current);
      return;
    }

    const fromLink = fromIndex !== -1 ? menuRefs.current[fromIndex] : null;
    const toLink = toIndex !== -1 ? menuRefs.current[toIndex] : null;

    // 如果没有变化，直接返回
    if (fromIndex === toIndex) {
      isAnimating.current = false;
      setActivePathname(previousPathname.current);
      return;
    }

    // 情况1：从菜单页面到非菜单页面 - 下划线向下移动并消失
    if (fromIndex !== -1 && toIndex === -1) {
      tl.to(
        underline,
        {
          y: 10,
          opacity: 0,
          duration: 0.5,
          ease: "power3.inOut",
        },
        0,
      );

      if (fromLink) {
        tl.to(
          fromLink,
          {
            color: "var(--muted-foreground)",
            duration: 0.4,
            ease: "power3.in",
          },
          0,
        );
      }
    }
    // 情况2：从非菜单页面到菜单页面 - 下划线向上移动并出现
    else if (fromIndex === -1 && toIndex !== -1 && toLink) {
      const toRect = toLink.getBoundingClientRect();

      // 先设置位置和宽度
      gsap.set(underline, {
        x:
          toRect.left -
          (underline.parentElement?.getBoundingClientRect().left || 0),
        width: toRect.width,
        y: 10,
        opacity: 0,
      });

      // 向上移动并出现
      tl.to(
        underline,
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.inOut",
        },
        0,
      );

      tl.to(
        toLink,
        {
          color: "#ffffff",
          duration: 0.4,
          ease: "power3.out",
        },
        0.2,
      );
    }
    // 情况3：在菜单页面之间移动 - 正常的移动动画
    else if (fromIndex !== -1 && toIndex !== -1 && toLink && fromLink) {
      const toRect = toLink.getBoundingClientRect();

      // 移动到新位置并调整宽度
      tl.to(
        underline,
        {
          x:
            toRect.left -
            (underline.parentElement?.getBoundingClientRect().left || 0),
          width: toRect.width,
          duration: 1,
          ease: "power3.inOut",
        },
        0,
      );

      // 链接颜色动画
      tl.to(
        fromLink!,
        {
          color: "var(--muted-foreground)",
          duration: 0.4,
          ease: "power3.in",
        },
        0.1,
      );

      tl.to(
        toLink,
        {
          color: "#ffffff",
          duration: 0.4,
          ease: "power3.out",
        },
        0.2,
      );
    }

    // 动画完成后重置状态
    tl.eventCallback("onComplete", () => {
      isAnimating.current = false;
      setActivePathname(previousPathname.current);
    });

    tl.eventCallback("onInterrupt", () => {
      isAnimating.current = false;
    });
  };

  // 监听路由变化，更新下划线状态
  useEffect(() => {
    const mainMenus = menus.filter((menu) => menu.category === "MAIN");

    // 如果是首次加载，直接设置状态
    if (previousPathname.current === pathname) {
      const activeIndex = mainMenus.findIndex((menu) => {
        const targetPath =
          menu.link ||
          (menu.slug ? "/" + menu.slug : null) ||
          (menu.page ? "/" + menu.page.slug : "#");
        return (
          pathname === targetPath ||
          (targetPath !== "#" && pathname.startsWith(targetPath + "/"))
        );
      });

      if (activeIndex !== -1) {
        const activeLink = menuRefs.current[activeIndex];
        const underline = underlineRef.current;

        if (activeLink && underline) {
          const rect = activeLink.getBoundingClientRect();
          const parentRect = underline.parentElement?.getBoundingClientRect();

          gsap.set(underline, {
            x: rect.left - (parentRect?.left || 0),
            width: rect.width,
            opacity: 1,
          });
        }

        if (activeLink) {
          gsap.set(activeLink, { color: "#ffffff" });
        }
      }
      setActivePathname(pathname);
      return;
    }

    // 找到旧的激活索引和新的激活索引
    const oldActiveIndex = mainMenus.findIndex((menu) => {
      const targetPath =
        menu.link ||
        (menu.slug ? "/" + menu.slug : null) ||
        (menu.page ? "/" + menu.page.slug : "#");
      return (
        activePathname === targetPath ||
        (targetPath !== "#" && activePathname.startsWith(targetPath + "/"))
      );
    });
    const newActiveIndex = mainMenus.findIndex((menu) => {
      const targetPath =
        menu.link ||
        (menu.slug ? "/" + menu.slug : null) ||
        (menu.page ? "/" + menu.page.slug : "#");
      return (
        pathname === targetPath ||
        (targetPath !== "#" && pathname.startsWith(targetPath + "/"))
      );
    });

    // 如果索引发生变化，执行动画
    if (oldActiveIndex !== newActiveIndex) {
      createUnderlineAnimation(oldActiveIndex, newActiveIndex);
    }

    previousPathname.current = pathname;
  }, [pathname, menus, activePathname]);

  // 窗口大小变化时重新计算下划线位置
  useEffect(() => {
    const mainMenus = menus.filter((menu) => menu.category === "MAIN");
    const activeIndex = mainMenus.findIndex((menu) => {
      const targetPath =
        menu.link ||
        (menu.slug ? "/" + menu.slug : null) ||
        (menu.page ? "/" + menu.page.slug : "#");
      return (
        activePathname === targetPath ||
        (targetPath !== "#" && activePathname.startsWith(targetPath + "/"))
      );
    });

    // 使用防抖优化性能
    const debounceTimer = setTimeout(() => {
      updateUnderlinePosition(activeIndex);
    }, 100);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [windowSize, activePathname, menus]);

  return (
    <>
      <motion.footer
        ref={footerRef}
        className="w-full h-[78px] text-foreground bg-background border-y border-border flex relative z-50"
        initial={{ y: 78 }}
        animate={{
          y: shouldAnimate
            ? 78
            : isConsoleOpen
              ? `calc(-60vh + 78px)`
              : isLoaded
                ? 0
                : 78,
        }}
        transition={{
          type: "spring",
          damping: 35,
          stiffness: 280,
          mass: 1,
          restDelta: 0.01,
          restSpeed: 0.01,
        }}
      >
        <div className="w-[78px] h-full border-r border-border flex items-center justify-center">
          <button
            className="flex flex-col justify-center items-center w-full h-full relative group"
            aria-label="登录"
          >
            <motion.div
              className="relative w-6 h-6 flex flex-col justify-center items-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                duration: 0.5,
                ease: "easeInOut",
                scale: { duration: 0.2 },
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute transition-colors duration-200 group-hover:text-white group-hover:cursor-pointer"
              >
                <circle cx="12" cy="7" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </motion.div>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground relative">
            {menus.map((menu, index) => {
              if (menu.category !== "MAIN") return null;
              const targetPath =
                menu.link ||
                (menu.slug ? "/" + menu.slug : null) ||
                (menu.page ? "/" + menu.page.slug : "#");
              const isActive =
                activePathname === targetPath ||
                (targetPath !== "#" &&
                  activePathname.startsWith(targetPath + "/"));
              return (
                <span
                  key={index}
                  className={`mx-6 relative ${isActive ? "text-white" : ""}`}
                >
                  <Link
                    ref={(el) => {
                      menuRefs.current[index] = el;
                      // 初始化时设置激活状态的颜色
                      if (isActive && el) {
                        gsap.set(el, { color: "#ffffff" });
                      }
                    }}
                    key={menu.id}
                    href={
                      menu.link ||
                      (menu.slug ? "/" + menu.slug : null) ||
                      (menu.page ? "/" + menu.page.slug : "#")
                    }
                    className="relative inline-block text-muted-foreground transition-colors duration-300"
                    onMouseEnter={() => handleMenuHover(index, isActive)}
                    onMouseLeave={() => handleMenuLeave(index, isActive)}
                  >
                    {menu.name}
                  </Link>
                </span>
              );
            })}
            {/* 单个共享的下划线 */}
            <span
              className="absolute bottom-0 left-0 h-px bg-white opacity-0 w-0"
              ref={underlineRef}
            />
          </div>
        </div>
        <ConsoleButton />
      </motion.footer>

      <AnimatePresence>
        {isConsoleOpen && (
          <>
            {/* 半透明遮罩层 */}
            <motion.div
              className="fixed inset-0 z-40 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
              }}
              onClick={() => useConsoleStore.getState().setConsoleOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-40"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 35,
                stiffness: 280,
                mass: 1,
                restDelta: 0.01,
                restSpeed: 0.01,
              }}
            >
              <Panel
                onClose={() => useConsoleStore.getState().setConsoleOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
