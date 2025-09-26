"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AutoTransitionProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export function AutoTransition({
  children,
  className = "",
  duration = 0.3,
}: AutoTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={String(children)}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
