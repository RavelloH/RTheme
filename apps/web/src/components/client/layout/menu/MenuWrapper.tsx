"use client";

import { motion } from "framer-motion";

export default function MenuWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
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
      {children}
    </motion.div>
  );
}
