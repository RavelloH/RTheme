"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  return (
    <div className="relative h-full min-h-0">
      <div
        className={`absolute top-0 left-0 right-2 h-6 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
          showTopGradient ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute bottom-0 left-0 right-2 h-6 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
          showBottomGradient ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={scrollRef}
        onScroll={updateGradient}
        className={`h-full min-h-0 overflow-y-auto pr-2 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
