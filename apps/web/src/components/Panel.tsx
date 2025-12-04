"use client";

import { useMobile } from "@/hooks/useMobile";

export function Panel({ onClose: _onClose }: { onClose: () => void }) {
  const isMobile = useMobile();

  // 根据设备类型获取高度值
  const getHeaderHeight = () => (isMobile ? "6em" : "5em");

  return (
    <div
      className="bg-background w-full border-t border-border shadow-lg"
      style={{ height: `calc(60vh - ${getHeaderHeight()})` }}
    ></div>
  );
}
