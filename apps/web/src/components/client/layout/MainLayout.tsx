"use client";
import { useMobile } from "@/hooks/use-mobile";

export default function MainLayout({
  children,
  type,
  className,
  nopadding,
}: {
  children: React.ReactNode;
  type: "horizontal" | "vertical";
  className?: string;
  nopadding?: boolean;
}) {
  const isMobile = useMobile();
  return (
    <div
      className={
        type === "horizontal" && !isMobile
          ? "h-[calc(100vh-10em)] overflow-y-hidden"
          : (className ? ` ${className}` : "") + (nopadding ? "" : " py-8 px-6")
      }
    >
      {children}
    </div>
  );
}
