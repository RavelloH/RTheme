"use client";

import { useMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

export function MenuHeader({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  const getMenuHeaderHeight = () => (isMobile ? "6em" : "5em");

  return (
    <div
      className="flex justify-center items-center w-full bg-primary text-primary-foreground"
      style={{ height: getMenuHeaderHeight() }}
    >
      {children}
    </div>
  );
}

export function MenuLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  return (
    <div className={isMobile ? "space-y-8" : "grid grid-cols-3 gap-6 h-full"}>
      {children}
    </div>
  );
}

export function MenuFooter({
  children,
  siteBirthday,
  siteAuthor,
}: {
  children?: React.ReactNode;
  siteBirthday: string;
  siteAuthor: string;
}) {
  const isMobile = useMobile();
  return (
    !isMobile && (
      <motion.div
        className="py-4 flex justify-center items-center w-full text-muted-foreground text-sm border-t border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <span>
          Copyright ©{" "}
          {(() => {
            const startYear = new Date(siteBirthday).getFullYear();
            const currentYear = new Date().getFullYear();
            return startYear === currentYear
              ? startYear
              : `${startYear} - ${currentYear}`;
          })()}{" "}
          {siteAuthor}.
        </span>
        {children}
      </motion.div>
    )
  );
}
