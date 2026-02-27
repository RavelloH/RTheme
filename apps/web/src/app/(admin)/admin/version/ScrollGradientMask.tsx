"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EDGE_FADE_PX = 24;

export default function ScrollGradientMask({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);

  const updateGradient = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const hasOverflow = scrollHeight - clientHeight > 10;

    if (!hasOverflow) {
      setShowTopGradient(false);
      setShowBottomGradient(false);
      return;
    }

    setShowTopGradient(scrollTop > 10);
    setShowBottomGradient(scrollTop < scrollHeight - clientHeight - 10);
  }, []);

  useEffect(() => {
    updateGradient();

    const container = scrollRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateGradient();
    });
    resizeObserver.observe(container);

    window.addEventListener("resize", updateGradient);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateGradient);
    };
  }, [updateGradient, children]);

  const maskImage = useMemo(() => {
    if (showTopGradient && showBottomGradient) {
      return `linear-gradient(to bottom, transparent 0px, black ${EDGE_FADE_PX}px, black calc(100% - ${EDGE_FADE_PX}px), transparent 100%)`;
    }
    if (showTopGradient) {
      return `linear-gradient(to bottom, transparent 0px, black ${EDGE_FADE_PX}px, black 100%)`;
    }
    if (showBottomGradient) {
      return `linear-gradient(to bottom, black 0px, black calc(100% - ${EDGE_FADE_PX}px), transparent 100%)`;
    }
    return null;
  }, [showBottomGradient, showTopGradient]);

  const maskStyle = maskImage
    ? {
        WebkitMaskImage: maskImage,
        maskImage,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
      }
    : undefined;

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={scrollRef}
        onScroll={updateGradient}
        style={maskStyle}
        className={`h-full min-h-0 overflow-y-auto pr-2 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
