"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import Menu from "./Menu";
import { useMenuStore } from "@/store/menuStore";
import type { MenuItem } from "@/lib/server/menuCache";

export function Header({ menus }: { menus: MenuItem[] }) {
  const [title, setTitle] = useState("NeutralPress");
  const { isMenuOpen, toggleMenu } = useMenuStore();
  const headerRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();

  // 监听加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoaded(true);

      // 使用GSAP动画从上方滑入
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -78 },
          {
            y: 0,
            duration: 0.8,
            ease: "power2.out",
          },
        );
      }
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);

    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
    };
  }, []);

  // 根据 pathname 更新标题
  useEffect(() => {
    const updateTitle = () => {
      if (typeof document === "undefined") return;

      const titleElement = document.querySelector("title");
      if (!titleElement) return;

      const documentTitle = titleElement.textContent || "";
      const cleanTitle = documentTitle.includes(" | ")
        ? documentTitle.split(" | ")[0] || "NeutralPress"
        : documentTitle || "NeutralPress";

      setTitle(cleanTitle);
    };

    // 延迟一点确保 DOM 已更新
    const timer = setTimeout(updateTitle, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <motion.header
        ref={headerRef}
        className="w-full h-[78px] text-foreground bg-background border-y border-border flex relative z-50"
        initial={{ y: -78 }}
        animate={{
          y: isMenuOpen ? `calc(100vh - 78px)` : isLoaded ? 0 : -78,
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
        <div className="w-[78px] flex items-center">
          <Image src="/avatar.jpg" alt="Logo" width={78} height={78} />
        </div>
        <div className="flex-1 flex items-center justify-center">{title}</div>
        <div className="w-[78px] h-full border-l border-border flex items-center justify-center">
          <MenuButton isOpen={isMenuOpen} onClick={toggleMenu} />
        </div>
      </motion.header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-background z-40"
            initial={{ y: `calc(-100% + 78px)` }}
            animate={{ y: 0 }}
            exit={{ y: `calc(-100% + 78px)` }}
            transition={{
              type: "spring",
              damping: 35,
              stiffness: 280,
              mass: 1,
              restDelta: 0.01,
              restSpeed: 0.01,
            }}
          >
            <div className="h-full pb-[78px]">
              <Menu
                setIsMenuOpen={(isOpen: boolean) =>
                  useMenuStore.getState().setMenuOpen(isOpen)
                }
                menus={menus}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex flex-col justify-center items-center w-full h-full relative group"
      aria-label="菜单"
      onClick={onClick}
    >
      <motion.div
        className="relative w-8 h-8 flex flex-col justify-center items-center"
        animate={{ rotate: isOpen ? 180 : 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          duration: 0.5,
          ease: "easeInOut",
          scale: { duration: 0.2 },
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          className="absolute transition-colors duration-200 group-hover:text-white group-hover:cursor-pointer"
          fill="none"
        >
          <motion.path
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M4 6h16"
            style={{ transformOrigin: "4px 6px" }}
            animate={{
              rotate: isOpen ? 45 : 0,
              y: isOpen ? 6 : 0,
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              delay: isOpen ? 0.2 : 0.2,
            }}
          />
          <motion.path
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M4 12h16"
            animate={{
              opacity: isOpen ? 0 : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
              delay: isOpen ? 0 : 0.2,
            }}
          />
          <motion.path
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M4 18h16"
            style={{ transformOrigin: "4px 18px" }}
            animate={{
              rotate: isOpen ? -45 : 0,
              y: isOpen ? -6 : 0,
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              delay: isOpen ? 0.2 : 0.2,
            }}
          />
        </svg>
      </motion.div>
    </button>
  );
}
