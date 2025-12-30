"use client";

import { useEffect, useState } from "react";
import { RiMessageLine } from "@remixicon/react";
import { useBroadcast } from "@/hooks/use-broadcast";

/**
 * 评论数显示组件
 * 通过广播接收评论数并显示
 */
export default function CommentCount() {
  const [count, setCount] = useState<number | null>(null);

  // 监听评论数广播
  useBroadcast((message: { type: string; count?: number }) => {
    if (
      message?.type === "comment-count" &&
      typeof message.count === "number"
    ) {
      setCount(message.count);
    }
  });

  // 当接收到评论数后，显示元素并添加淡入动画
  useEffect(() => {
    if (count !== null) {
      // 显示分隔符
      const separators = document.querySelectorAll<HTMLElement>(
        "[data-commentcount-separator]",
      );
      separators.forEach((element) => {
        element.classList.remove("opacity-0");
        element.style.transition = "opacity 0.3s ease-in-out";
        element.style.opacity = "1";
      });

      // 显示评论数
      const elements = document.querySelectorAll<HTMLElement>(
        "[data-commentcount]",
      );
      elements.forEach((element) => {
        element.classList.remove("opacity-0");
        element.style.transition = "opacity 0.3s ease-in-out";
        element.style.opacity = "1";
      });
    }
  }, [count]);

  return (
    <>
      <span className="transition-all opacity-0" data-commentcount-separator>
        /
      </span>
      <span
        className="flex items-center gap-1 transition-all opacity-0"
        data-commentcount
      >
        <RiMessageLine size={"1em"} />
        <span>{count ?? "---"}</span>
      </span>
    </>
  );
}
