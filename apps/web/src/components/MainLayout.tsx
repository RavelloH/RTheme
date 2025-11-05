"use client";
import { useMobile } from "@/hooks/useMobile";

export default function MainLayout({
  children,
  type,
  className,
}: {
  children: React.ReactNode;
  type: "horizontal" | "vertical";
  className?: string;
}) {
  const isMobile = useMobile();
  return (
    <div
      className={
        type === "horizontal" && !isMobile
          ? "h-[calc(100vh-10em)] overflow-y-hidden"
          : "overflow-y-auto py-8 px-6" + (className ? ` ${className}` : "")
      }
    >
      {children}
    </div>
  );
}
