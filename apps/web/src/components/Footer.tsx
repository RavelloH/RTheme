"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMenuStore } from "@/store/menuStore";

export default function Footer() {
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const isMenuOpen = useMenuStore((state) => state.isMenuOpen);

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

    return (
        <motion.footer 
            className="w-full h-[78px] text-foreground bg-background border-t border-border flex items-center justify-center"
            initial={false}
            animate={{
                y: shouldAnimate ? 78 : 0, // 向下移动78px，移出视口
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
            <span className="text-sm text-muted-foreground">© 2024 NeutralPress. All rights reserved.</span>
        </motion.footer>
    );
}