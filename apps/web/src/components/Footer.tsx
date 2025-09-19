"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useMenuStore } from "@/store/menuStore";
import Image from "next/image";
import { Panel } from "./Panel";

export default function Footer() {
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const isMenuOpen = useMenuStore((state) => state.isMenuOpen);
    const footerRef = useRef<HTMLElement>(null);

    // 监听加载完成事件
    useEffect(() => {
        const handleLoadingComplete = () => {
            setIsLoaded(true);

            // 使用GSAP动画从下方滑入
            if (footerRef.current) {
                gsap.fromTo(footerRef.current,
                    { y: 78 },
                    {
                        y: 0,
                        duration: 0.8,
                        ease: "power2.out",
                        delay: 0.2 // 稍微延迟，让Header先动画
                    }
                );
            }
        };

        window.addEventListener('loadingComplete', handleLoadingComplete);

        return () => {
            window.removeEventListener('loadingComplete', handleLoadingComplete);
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

    const toggleControlCenter = () => {
        setIsConsoleOpen(!isConsoleOpen);
    };

    function ControlCenterIcon({ className }: { className?: string }) {
        return (
            <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className={className}
            >
                <motion.path
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M3 3h7v7H3z"
                    style={{ transformOrigin: "6.5px 6.5px" }}
                    animate={{
                        rotate: isConsoleOpen ? 45 : 0,
                        scale: isConsoleOpen ? 0.9 : 1,
                    }}
                    transition={{
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1],
                        delay: isConsoleOpen ? 0.2 : 0.2,
                    }}
                />
                <motion.path
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M3 14h7v7H3z"
                    style={{ transformOrigin: "6.5px 17.5px" }}
                    animate={{
                        rotate: isConsoleOpen ? -45 : 0,
                        scale: isConsoleOpen ? 0.9 : 1,
                    }}
                    transition={{
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1],
                        delay: isConsoleOpen ? 0.2 : 0.2,
                    }}
                />
                <motion.path
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M14 3h7v7h-7z"
                    style={{ transformOrigin: "17.5px 6.5px" }}
                    animate={{
                        rotate: isConsoleOpen ? -45 : 0,
                        scale: isConsoleOpen ? 0.9 : 1,
                    }}
                    transition={{
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1],
                        delay: isConsoleOpen ? 0.2 : 0.2,
                    }}
                />
                <motion.path
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M14 14h7v7h-7z"
                    style={{ transformOrigin: "17.5px 17.5px" }}
                    animate={{
                        rotate: isConsoleOpen ? 45 : 0,
                        scale: isConsoleOpen ? 0.9 : 1,
                    }}
                    transition={{
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1],
                        delay: isConsoleOpen ? 0.2 : 0.2,
                    }}
                />
            </svg>
        );
    }

    return (
        <>
        <motion.footer
            ref={footerRef}
            className="w-full h-[78px] text-foreground bg-background border-y border-border flex relative z-50"
            initial={{ y: 78 }}
            animate={{
                y: shouldAnimate ? 78 : (isConsoleOpen ? `calc(-60vh + 78px)` : (isLoaded ? 0 : 78)),
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
            <div className="flex-1 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">© 2024 NeutralPress. All rights reserved.</span>
            </div>
            <div className="w-[78px] h-full border-l border-border flex items-center justify-center">
                <button
                    className="flex flex-col justify-center items-center w-full h-full relative group"
                    aria-label="控制中心"
                    onClick={toggleControlCenter}
                >
                    <motion.div
                        className="relative w-6 h-6 flex flex-col justify-center items-center"
                        animate={{ rotate: isConsoleOpen ? 180 : 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                            duration: 0.5,
                            ease: "easeInOut",
                            scale: { duration: 0.2 }
                        }}
                    >
                        <ControlCenterIcon className="absolute transition-colors duration-200 group-hover:text-white group-hover:cursor-pointer" />
                    </motion.div>
                </button>
            </div>
        </motion.footer>

        <AnimatePresence>
            {isConsoleOpen && (
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
                    <Panel onClose={() => setIsConsoleOpen(false)} />
                </motion.div>
            )}
        </AnimatePresence>
    </>
    );
}