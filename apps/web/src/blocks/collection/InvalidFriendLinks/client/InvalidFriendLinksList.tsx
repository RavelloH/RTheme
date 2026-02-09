"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { InvalidFriendLinkItem } from "@/blocks/collection/InvalidFriendLinks/types";

interface InvalidFriendLinksListProps {
  headerText: string;
  links: InvalidFriendLinkItem[];
  showAsLink: boolean;
  showDuration: boolean;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未记录";
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LinkName({
  name,
  url,
  showAsLink,
}: {
  name: string;
  url: string;
  showAsLink: boolean;
}) {
  if (!showAsLink) {
    return <span>{name}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline text-primary hover:underline"
    >
      {name}
    </a>
  );
}

export default function InvalidFriendLinksList({
  headerText,
  links,
  showAsLink,
  showDuration,
}: InvalidFriendLinksListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(true);

  const updateGradientState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowTopGradient(scrollTop > 10);
    setShowBottomGradient(scrollTop < scrollHeight - clientHeight - 10);
  }, []);

  useEffect(() => {
    updateGradientState();
  }, [links.length, updateGradientState]);

  return (
    <div className="flex h-full flex-col overflow-hidden p-10">
      <div className="flex h-12 shrink-0 items-center justify-between">
        <div className="text-3xl">{headerText}</div>
        <div className="text-sm text-muted-foreground">
          共 {links.length} 条
        </div>
      </div>

      <div className="my-2 min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full min-h-0">
          <div
            className={`pointer-events-none absolute left-0 right-2 top-0 z-10 h-6 bg-gradient-to-b from-background via-background/80 to-transparent transition-opacity duration-300 ${
              showTopGradient ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute bottom-0 left-0 right-2 z-10 h-6 bg-gradient-to-t from-background via-background/80 to-transparent transition-opacity duration-300 ${
              showBottomGradient ? "opacity-100" : "opacity-0"
            }`}
          />

          {links.length > 0 ? (
            <div
              ref={scrollContainerRef}
              onScroll={updateGradientState}
              className="h-full overflow-y-auto scrollbar-hide pr-2"
            >
              <ul className="divide-y divide-border/60">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="py-4 flex items-center gap-4 text-muted-foreground text-sm"
                  >
                    <span className="font-medium text-foreground">
                      <LinkName
                        name={link.name}
                        url={link.url}
                        showAsLink={showAsLink}
                      />
                    </span>

                    <span>{link.reasonText}</span>
                    <span>失效于：{formatDateTime(link.lastCheckedAt)}</span>
                    {showDuration ? (
                      <span>有效时间：{link.validDuration || "未记录"}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              暂无失效友情链接
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
