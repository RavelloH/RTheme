"use client";

import {
  type FocusEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { FriendLinkItem } from "@/blocks/collection/FriendLinks/types";
import type { GridArea } from "@/components/client/layout/RowGrid";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import UserAvatar from "@/components/ui/UserAvatar";
import { createArray } from "@/lib/client/create-array";

const COLUMNS = 4;
const COLUMN_AREAS: GridArea[][] = [
  createArray(1, 3),
  createArray(4, 6),
  createArray(7, 9),
  createArray(10, 12),
];

type Tone = "default" | "inverse";

interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = items[i];
    const target = items[j];

    if (current !== undefined && target !== undefined) {
      items[i] = target;
      items[j] = current;
    }
  }
}

function randomizeWithinOrderGroups(links: FriendLinkItem[]): FriendLinkItem[] {
  const grouped = new Map<number, FriendLinkItem[]>();

  for (const item of links) {
    const group = grouped.get(item.order);
    if (group) {
      group.push(item);
    } else {
      grouped.set(item.order, [item]);
    }
  }

  const orderKeys = Array.from(grouped.keys()).sort((a, b) => a - b);
  const result: FriendLinkItem[] = [];

  for (const orderKey of orderKeys) {
    const sameOrderItems = [...(grouped.get(orderKey) || [])];
    shuffleInPlace(sameOrderItems);
    result.push(...sameOrderItems);
  }

  return result;
}

function applyLimit(
  links: FriendLinkItem[],
  limit: number | null,
): FriendLinkItem[] {
  if (limit === null) {
    return links;
  }

  return links.slice(0, Math.max(0, limit));
}

function buildFilledSlots(
  links: FriendLinkItem[],
): Array<FriendLinkItem | null> {
  if (links.length === 0) {
    return Array.from({ length: COLUMNS }, () => null);
  }

  const remainder = links.length % COLUMNS;
  const emptyCount = remainder === 0 ? 0 : COLUMNS - remainder;

  return [...links, ...Array.from({ length: emptyCount }, () => null)];
}

function resolveHighlightRect(
  container: HTMLElement,
  card: HTMLElement,
): HighlightRect {
  const containerRect = container.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();

  return {
    x: cardRect.left - containerRect.left,
    y: cardRect.top - containerRect.top,
    width: cardRect.width,
    height: cardRect.height,
  };
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

function EmptyFriendLinkCard() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="text-center text-muted-foreground/60 uppercase">
        <div className="text-lg tracking-[0.2em]">EMPTY</div>
      </div>
    </div>
  );
}

function FriendLinkCardContent({
  item,
  tone,
}: {
  item: FriendLinkItem;
  tone: Tone;
}) {
  const summary = item.slogan?.trim() || `${item.domain} / ${item.name}`;
  const isInverse = tone === "inverse";

  return (
    <div className="flex h-full w-full items-center gap-5 p-10">
      <div className="shrink-0">
        <UserAvatar
          username={item.name}
          avatarUrl={item.avatar}
          shape="circle"
          size={96}
          className={
            isInverse
              ? "border border-primary-foreground/30"
              : "border border-muted"
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-2xl font-medium ${isInverse ? "text-primary-foreground" : ""}`}
          data-fade-char
        >
          {item.name}
        </div>
        <div
          className={`mt-1 line-clamp-2 text-lg ${isInverse ? "text-primary-foreground/85" : "text-muted-foreground"}`}
          data-fade-word
        >
          {summary}
        </div>
      </div>
    </div>
  );
}

function FriendLinkCard({
  item,
  inverseClipPath,
  onActivate,
  registerRef,
}: {
  item: FriendLinkItem;
  inverseClipPath: string;
  onActivate: (id: number, element: HTMLAnchorElement) => void;
  registerRef: (id: number, element: HTMLAnchorElement | null) => void;
}) {
  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    onActivate(item.id, event.currentTarget);
  };

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    onActivate(item.id, event.currentTarget);
  };

  return (
    <Link
      ref={(element) => registerRef(item.id, element)}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-full w-full overflow-hidden bg-transparent"
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
    >
      <div className="relative z-10 h-full w-full">
        <FriendLinkCardContent item={item} tone="default" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-20 [will-change:clip-path]"
        style={{ clipPath: inverseClipPath }}
      >
        <FriendLinkCardContent item={item} tone="inverse" />
      </div>
    </Link>
  );
}

interface FriendLinksGridProps {
  links: FriendLinkItem[];
  randomEnabled: boolean;
  limit: number | null;
}

export default function FriendLinksGrid({
  links,
  randomEnabled,
  limit,
}: FriendLinksGridProps) {
  const stableLinks = useMemo(
    () => [...links].sort((a, b) => a.order - b.order || a.id - b.id),
    [links],
  );

  // 使用 useRef 缓存随机化结果，避免 useMemo 在依赖不变时重新随机化
  const randomCacheRef = useRef<{
    key: string;
    result: FriendLinkItem[];
  } | null>(null);

  const displayLinks = useMemo(() => {
    if (!randomEnabled) {
      randomCacheRef.current = null;
      return applyLimit(stableLinks, limit);
    }

    // 仅在 stableLinks 或 limit 变化时重新随机化
    const cacheKey = `${stableLinks.map((l) => l.id).join(",")}_${limit}`;
    const cached = randomCacheRef.current;
    if (cached && cached.key === cacheKey) {
      return cached.result;
    }

    const result = applyLimit(randomizeWithinOrderGroups(stableLinks), limit);
    randomCacheRef.current = { key: cacheKey, result };
    return result;
  }, [stableLinks, randomEnabled, limit]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefMap = useRef<Map<number, HTMLAnchorElement>>(new Map());
  const rectAnimationFrameRef = useRef<number | null>(null);
  const animatedRectRef = useRef<HighlightRect | null>(null);

  const [cardLayoutMap, setCardLayoutMap] = useState<
    Record<number, HighlightRect>
  >({});
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [animatedRect, setAnimatedRect] = useState<HighlightRect | null>(null);

  const stopRectAnimation = useCallback(() => {
    if (rectAnimationFrameRef.current !== null) {
      cancelAnimationFrame(rectAnimationFrameRef.current);
      rectAnimationFrameRef.current = null;
    }
  }, []);

  const refreshCardLayouts = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const next: Record<number, HighlightRect> = {};
    cardRefMap.current.forEach((element, id) => {
      next[id] = resolveHighlightRect(container, element);
    });
    setCardLayoutMap(next);
  }, []);

  const setAnimatedRectInstant = useCallback((rect: HighlightRect) => {
    animatedRectRef.current = rect;
    setAnimatedRect(rect);
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
        setAnimatedRectInstant(targetRect);
        return;
      }

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const nextRect = interpolateRect(fromRect, targetRect, progress);
        setAnimatedRectInstant(nextRect);

        if (progress < 1) {
          rectAnimationFrameRef.current = requestAnimationFrame(tick);
        } else {
          rectAnimationFrameRef.current = null;
        }
      };

      rectAnimationFrameRef.current = requestAnimationFrame(tick);
    },
    [setAnimatedRectInstant, stopRectAnimation],
  );

  const registerCardRef = useCallback(
    (id: number, element: HTMLAnchorElement | null) => {
      if (element) {
        cardRefMap.current.set(id, element);
      } else {
        cardRefMap.current.delete(id);
      }
    },
    [],
  );

  const activateCard = useCallback(
    (id: number, element: HTMLAnchorElement) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const targetRect = resolveHighlightRect(container, element);
      setActiveCardId(id);
      setHighlightVisible(true);
      animateHighlightTo(targetRect);
    },
    [animateHighlightTo],
  );

  const clearActiveCard = useCallback(() => {
    setActiveCardId(null);
    setHighlightVisible(false);
  }, []);

  useEffect(() => {
    refreshCardLayouts();
  }, [displayLinks, refreshCardLayouts]);

  useEffect(() => {
    const handleResize = () => {
      refreshCardLayouts();

      if (activeCardId === null) {
        return;
      }

      const container = containerRef.current;
      const activeElement = cardRefMap.current.get(activeCardId);
      if (!container || !activeElement) {
        return;
      }

      setAnimatedRectInstant(resolveHighlightRect(container, activeElement));
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [activeCardId, refreshCardLayouts, setAnimatedRectInstant]);

  useEffect(() => {
    return () => {
      stopRectAnimation();
    };
  }, [stopRectAnimation]);

  useEffect(() => {
    if (
      activeCardId !== null &&
      !displayLinks.some((link) => link.id === activeCardId)
    ) {
      clearActiveCard();
    }
  }, [activeCardId, clearActiveCard, displayLinks]);

  const slots = useMemo(() => buildFilledSlots(displayLinks), [displayLinks]);

  const inverseClipMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const item of displayLinks) {
      map[item.id] = toInverseClipPath(
        cardLayoutMap[item.id],
        animatedRect,
        highlightVisible,
      );
    }
    return map;
  }, [animatedRect, cardLayoutMap, displayLinks, highlightVisible]);

  const highlight = animatedRect || { x: 0, y: 0, width: 0, height: 0 };

  return (
    <div
      ref={containerRef}
      className="relative bg-background h-full"
      onMouseLeave={clearActiveCard}
      onBlurCapture={(event) => {
        const nextFocus = event.relatedTarget as Node | null;
        if (!nextFocus || !containerRef.current?.contains(nextFocus)) {
          clearActiveCard();
        }
      }}
    >
      <div
        className="pointer-events-none absolute z-0 bg-primary [will-change:transform,width,height,opacity]"
        style={{
          transform: `translate3d(${highlight.x}px, ${highlight.y}px, 0)`,
          width: highlight.width,
          height: highlight.height,
          opacity: highlightVisible ? 1 : 0,
          transition: "opacity 160ms ease-out",
        }}
      />

      <RowGrid className="relative z-10">
        {slots.map((item, index) => (
          <GridItem
            key={item ? `friend-link-${item.id}` : `friend-link-empty-${index}`}
            areas={COLUMN_AREAS[index % COLUMNS] || createArray(1, 3)}
            width={3.4}
            height={0.32}
            className="!border-0 overflow-hidden"
          >
            {item ? (
              <FriendLinkCard
                item={item}
                inverseClipPath={inverseClipMap[item.id] || "inset(100% 0 0 0)"}
                onActivate={activateCard}
                registerRef={registerCardRef}
              />
            ) : (
              <EmptyFriendLinkCard />
            )}
          </GridItem>
        ))}
      </RowGrid>
    </div>
  );
}
