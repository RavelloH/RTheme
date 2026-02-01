"use client";

import { useMobile } from "@/hooks/use-mobile";

interface LayoutContainerProps {
  children: React.ReactNode;
}

export function LayoutContainer({ children }: LayoutContainerProps) {
  const isMobile = useMobile();

  return (
    <div
      className={
        isMobile
          ? "min-h-screen flex flex-col"
          : "h-screen flex flex-col overflow-hidden"
      }
    >
      {children}
    </div>
  );
}
