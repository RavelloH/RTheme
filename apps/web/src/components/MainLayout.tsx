"use client";
import { useMobile } from "@/hooks/useMobile";

export default function MainLayout({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "horizontal" | "vertical";
}) {
  const isMobile = useMobile();
  return (
    <div
      className={
        type === "horizontal" && !isMobile
          ? "h-[calc(100vh-156px)] overflow-y-hidden"
          : "overflow-y-auto"
      }
    >
      {children}
    </div>
  );
}
