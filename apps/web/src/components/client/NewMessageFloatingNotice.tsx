"use client";

import Clickable from "@/ui/Clickable";
import { RiArrowDownLine } from "@remixicon/react";

interface NewMessageFloatingNoticeProps {
  onClick: () => void;
  count?: number;
}

export default function NewMessageFloatingNotice({
  onClick,
  count = 1,
}: NewMessageFloatingNoticeProps) {
  return (
    <div className="absolute bottom-0 z-10 w-full flex justify-center pb-4 text-primary">
      <Clickable
        onClick={onClick}
        className="shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center gap-2 text-sm"
        hoverScale={1.1}
      >
        {count} 条新消息 <RiArrowDownLine size="1.25em" />
      </Clickable>
    </div>
  );
}
