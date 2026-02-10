"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { MenuLayout } from "@/components/client/layout/menu/MenuMiscs";
import Link from "@/components/ui/Link";
import { useBroadcastSender } from "@/hooks/use-broadcast";

interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MenuItemData {
  id: string;
  icon?: React.ReactNode;
  name: string;
  href: string;
  target?: string;
  rel?: string;
  dataLink: string;
  trailing?: React.ReactNode;
}

export interface MenuSectionData {
  id: string;
  title?: string;
  items: MenuItemData[];
}

interface MenuItemEntry {
  key: string;
  item: MenuItemData;
}

interface NormalizedSection {
  key: string;
  title?: string;
  entries: MenuItemEntry[];
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function interpolateRect(
  fromRect: HighlightRect,
  toRect: HighlightRect,
  progress: number,
): HighlightRect {
  const p = easeOutCubic(progress);
  return {
    x: fromRect.x + (toRect.x - fromRect.x) * p,
    y: fromRect.y + (toRect.y - fromRect.y) * p,
    width: fromRect.width + (toRect.width - fromRect.width) * p,
    height: fromRect.height + (toRect.height - fromRect.height) * p,
  };
}

function resolveHighlightRect(
  container: HTMLElement,
  element: HTMLElement,
): HighlightRect {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return {
    x: elementRect.left - containerRect.left,
    y: elementRect.top - containerRect.top,
    width: elementRect.width,
    height: elementRect.height,
  };
}

function clampPercent(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function toInverseClipPath(
  cardRect: HighlightRect | undefined,
  highlightRect: HighlightRect | null,
  visible: boolean,
): string {
  if (!visible || !cardRect || !highlightRect) {
    return "inset(100% 0 0 0)";
  }

  const cardLeft = cardRect.x;
  const cardTop = cardRect.y;
  const cardRight = cardRect.x + cardRect.width;
  const cardBottom = cardRect.y + cardRect.height;

  const highlightLeft = highlightRect.x;
  const highlightTop = highlightRect.y;
  const highlightRight = highlightRect.x + highlightRect.width;
  const highlightBottom = highlightRect.y + highlightRect.height;

  const intersectLeft = Math.max(cardLeft, highlightLeft);
  const intersectTop = Math.max(cardTop, highlightTop);
  const intersectRight = Math.min(cardRight, highlightRight);
  const intersectBottom = Math.min(cardBottom, highlightBottom);

  if (intersectLeft >= intersectRight || intersectTop >= intersectBottom) {
    return "inset(100% 0 0 0)";
  }

  const topInset =
    ((intersectTop - cardTop) / Math.max(cardRect.height, 1)) * 100;
  const rightInset =
    ((cardRight - intersectRight) / Math.max(cardRect.width, 1)) * 100;
  const bottomInset =
    ((cardBottom - intersectBottom) / Math.max(cardRect.height, 1)) * 100;
  const leftInset =
    ((intersectLeft - cardLeft) / Math.max(cardRect.width, 1)) * 100;

  return `inset(${clampPercent(topInset)}% ${clampPercent(rightInset)}% ${clampPercent(bottomInset)}% ${clampPercent(leftInset)}%)`;
}

export default function MenuItemWrapper({
  items,
  sections,
}: {
  items?: MenuItemData[];
  sections?: MenuSectionData[];
}) {
  const [mounted, setMounted] = useState(false);
  const { broadcast } = useBroadcastSender<{ type: string }>();

  const normalizedSections = useMemo<NormalizedSection[]>(() => {
    if (sections && sections.length > 0) {
      return sections.map((section, sectionIndex) => {
        const sectionKey = section.id || `section-${sectionIndex}`;
        return {
          key: sectionKey,
          title: section.title,
          entries: section.items.map((item, itemIndex) => ({
            key: `${sectionKey}:${item.id}:${itemIndex}`,
            item,
          })),
        };
      });
    }

    const fallbackItems = items ?? [];
    return [
      {
        key: "default",
        entries: fallbackItems.map((item, index) => ({
          key: `default:${item.id}:${index}`,
          item,
        })),
      },
    ];
  }, [items, sections]);

  const flatEntries = useMemo(
    () => normalizedSections.flatMap((section) => section.entries),
    [normalizedSections],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const itemRefMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const overlayRefMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const cachedItemRects = useRef<Map<string, HighlightRect>>(new Map());
  const rectAnimationFrameRef = useRef<number | null>(null);
  const animatedRectRef = useRef<HighlightRect | null>(null);
  const highlightVisibleRef = useRef(false);
  const pendingHideRef = useRef(false);

  const handleMenuClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const link = (e.currentTarget.querySelector("a") as HTMLAnchorElement)
      ?.dataset?.link;
    if (!link) return;

    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
      e.preventDefault();
    } else {
      broadcast({ type: "menu-close" });
    }
  };

  useEffect(() => {
    setMounted(true);
  }, [broadcast]);

  const stopRectAnimation = useCallback(() => {
    if (rectAnimationFrameRef.current !== null) {
      cancelAnimationFrame(rectAnimationFrameRef.current);
      rectAnimationFrameRef.current = null;
    }
  }, []);

  const performHide = useCallback(() => {
    highlightVisibleRef.current = false;
    if (highlightRef.current) {
      highlightRef.current.style.opacity = "0";
    }
    overlayRefMap.current.forEach((overlayEl) => {
      overlayEl.style.opacity = "0";
    });
  }, []);

  const refreshItemRects = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    cachedItemRects.current.clear();
    itemRefMap.current.forEach((element, id) => {
      cachedItemRects.current.set(id, resolveHighlightRect(container, element));
    });
  }, []);

  const applyHighlightRect = useCallback((rect: HighlightRect) => {
    animatedRectRef.current = rect;

    const el = highlightRef.current;
    if (el) {
      el.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
    }

    const visible = highlightVisibleRef.current;
    overlayRefMap.current.forEach((overlayEl, key) => {
      const cardRect = cachedItemRects.current.get(key);
      overlayEl.style.clipPath = toInverseClipPath(cardRect, rect, visible);
    });
  }, []);

  const animateHighlightTo = useCallback(
    (targetRect: HighlightRect) => {
      stopRectAnimation();
      const fromRect = animatedRectRef.current ?? targetRect;
      const duration = 320;
      const startTime = performance.now();

      if (
        fromRect.x === targetRect.x &&
        fromRect.y === targetRect.y &&
        fromRect.width === targetRect.width &&
        fromRect.height === targetRect.height
      ) {
        applyHighlightRect(targetRect);
        return;
      }

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const nextRect = interpolateRect(fromRect, targetRect, progress);
        applyHighlightRect(nextRect);
        if (progress < 1) {
          rectAnimationFrameRef.current = requestAnimationFrame(tick);
        } else {
          rectAnimationFrameRef.current = null;
          if (pendingHideRef.current) {
            pendingHideRef.current = false;
            performHide();
          }
        }
      };

      rectAnimationFrameRef.current = requestAnimationFrame(tick);
    },
    [applyHighlightRect, performHide, stopRectAnimation],
  );

  const activateItem = useCallback(
    (id: string, element: HTMLDivElement) => {
      const container = containerRef.current;
      if (!container) return;
      pendingHideRef.current = false;
      const targetRect = resolveHighlightRect(container, element);
      cachedItemRects.current.set(id, targetRect);

      if (!highlightVisibleRef.current) {
        stopRectAnimation();
        highlightVisibleRef.current = true;
        if (highlightRef.current) {
          highlightRef.current.style.opacity = "1";
        }
        overlayRefMap.current.forEach((overlayEl) => {
          overlayEl.style.opacity = "1";
        });
        applyHighlightRect(targetRect);
        return;
      }

      animateHighlightTo(targetRect);
    },
    [animateHighlightTo, applyHighlightRect, stopRectAnimation],
  );

  const clearHighlight = useCallback(() => {
    if (rectAnimationFrameRef.current !== null) {
      pendingHideRef.current = true;
    } else {
      performHide();
    }
  }, [performHide]);

  const registerItemRef = useCallback(
    (id: string, element: HTMLDivElement | null) => {
      if (element) {
        itemRefMap.current.set(id, element);
      } else {
        itemRefMap.current.delete(id);
      }
    },
    [],
  );

  const registerOverlayRef = useCallback(
    (id: string, element: HTMLDivElement | null) => {
      if (element) {
        overlayRefMap.current.set(id, element);
      } else {
        overlayRefMap.current.delete(id);
      }
    },
    [],
  );

  useEffect(() => {
    refreshItemRects();
  }, [flatEntries, refreshItemRects]);

  useEffect(() => {
    const handleResize = () => refreshItemRects();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [refreshItemRects]);

  useEffect(() => {
    return () => stopRectAnimation();
  }, [stopRectAnimation]);

  if (!mounted) {
    return (
      <MenuLayout>
        {normalizedSections.map((section) => (
          <div key={section.key} className="space-y-4">
            {section.title && (
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                {section.title}
              </h3>
            )}
            <div className="grid grid-cols-1 overflow-y-auto overflow-x-hidden">
              {section.entries.map(({ key, item }) => (
                <div key={key} className="w-full">
                  <Link
                    href={item.href}
                    target={item.target}
                    rel={item.rel}
                    data-link={item.dataLink}
                    className="w-full text-left p-4 flex items-center space-x-3 bg-transparent text-foreground"
                  >
                    {item.icon}
                    <span>{item.name}</span>
                    {item.trailing}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </MenuLayout>
    );
  }

  return (
    <div ref={containerRef} className="relative" onMouseLeave={clearHighlight}>
      <div
        ref={highlightRef}
        className="pointer-events-none absolute z-0 bg-primary [will-change:transform,width,height]"
        style={{
          transform: "translate3d(0px, 0px, 0)",
          width: 0,
          height: 0,
          opacity: 0,
          transition: "opacity 160ms ease-out",
        }}
      />

      <MenuLayout>
        {normalizedSections.map((section) => (
          <div key={section.key} className="space-y-4">
            {section.title && (
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                {section.title}
              </h3>
            )}
            <div className="grid grid-cols-1 overflow-y-auto overflow-x-hidden">
              {section.entries.map(({ key, item }, itemIndex) => (
                <motion.div
                  key={key}
                  ref={(el) => registerItemRef(key, el)}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: itemIndex * 0.03,
                    type: "spring",
                    damping: 17,
                    stiffness: 300,
                  }}
                  onClick={handleMenuClick}
                  onMouseEnter={(e) => activateItem(key, e.currentTarget)}
                  className="relative w-full"
                >
                  <div className="relative z-10">
                    <Link
                      href={item.href}
                      target={item.target}
                      rel={item.rel}
                      data-link={item.dataLink}
                      className="w-full text-left p-4 flex items-center space-x-3 bg-transparent text-foreground"
                    >
                      {item.icon}
                      <span>{item.name}</span>
                      {item.trailing}
                    </Link>
                  </div>

                  <div
                    ref={(el) => registerOverlayRef(key, el)}
                    className="pointer-events-none absolute inset-0 z-20 bg-primary !text-primary-foreground [will-change:clip-path] [&_*]:!text-primary-foreground"
                    style={{
                      clipPath: "inset(100% 0 0 0)",
                      opacity: 0,
                      transition: "opacity 160ms ease-out",
                    }}
                  >
                    <div
                      className="w-full text-left p-4 flex items-center space-x-3"
                      aria-hidden
                    >
                      {item.icon}
                      <span>{item.name}</span>
                      {item.trailing}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </MenuLayout>
    </div>
  );
}
