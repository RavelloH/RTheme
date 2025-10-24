"use client";
import { useBroadcastSender } from "@/hooks/useBroadcast";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function MenuItemWrapper({
  children,
}: {
  children: React.ReactElement<{ children?: React.ReactNode }>;
}) {
  const [mounted, setMounted] = useState(false);
  const { broadcast } = useBroadcastSender<{ type: string }>();

  const handleMenuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const link = (e.currentTarget.querySelector("a") as HTMLAnchorElement)
      ?.dataset?.link;
    if (!link) return;

    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
      e.preventDefault();
    } else {
      broadcast({
        type: "menu-close",
      });
    }
  };

  // 确保动画只在浏览器端执行
  useEffect(() => {
    setMounted(true);
  }, [broadcast]);

  if (!mounted) return children;

  // 将子元素提取为 motion.div
  return (
    <div className="grid grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden">
      {Array.isArray(children.props.children)
        ? children.props.children.map((child, index: number) => (
            <motion.div
              key={child.key || index}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.03,
                type: "spring",
                damping: 17,
                stiffness: 300,
              }}
              onClick={handleMenuClick}
            >
              {child}
            </motion.div>
          ))
        : children}
    </div>
  );
}
