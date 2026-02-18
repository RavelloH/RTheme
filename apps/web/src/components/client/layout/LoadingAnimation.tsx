"use client";

import { type CSSProperties, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useTheme } from "next-themes";

import { PageLoadManager } from "@/components/client/layout/PageLoadManager";
import { useConfig } from "@/context/ConfigContext";
import { normalizeSiteColorConfig } from "@/lib/shared/site-color";
import type { ConfigType } from "@/types/config";
import { AutoTransition } from "@/ui/AutoTransition";

type LoadingAnimationProps = {
  mainColor: ConfigType<"site.color">;
};

export function LoadingAnimation({ mainColor }: LoadingAnimationProps) {
  const { resolvedTheme } = useTheme();
  const normalizedColor = useMemo(
    () => normalizeSiteColorConfig(mainColor),
    [mainColor],
  );
  const activeThemeColors =
    resolvedTheme === "light" ? normalizedColor.light : normalizedColor.dark;

  const loadingPrimary = activeThemeColors.primary;
  const loadingBackground = activeThemeColors.background;
  const loadingMuted = activeThemeColors.muted;
  const loadingForeground = activeThemeColors.foreground;

  const overlayStyle = {
    opacity: 1,
    "--color-primary": loadingPrimary,
    "--color-background": loadingBackground,
    "--color-muted": loadingMuted,
    "--color-foreground": loadingForeground,
  } as CSSProperties;

  const siteName = useConfig("site.title");
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);
  const [loadingText, setLoadingText] = useState("LOADING...");

  const handlePageLoadComplete = () => {
    if (hasTriggeredRef.current || !overlayRef.current) return;
    hasTriggeredRef.current = true;

    // 先将文字改为 LOAD COMPLETED.
    setLoadingText("LOAD COMPLETED.");

    // 等待文字切换动画完成后再淡出整个遮罩
    setTimeout(() => {
      const notifyLoadingComplete = () => {
        document.body.setAttribute("data-loading-complete", "true");
        const event = new CustomEvent("loadingComplete");
        window.dispatchEvent(event);
      };

      if (!overlayRef.current) {
        notifyLoadingComplete();
        return;
      }

      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          // 统一由 LoadingAnimation 标记并广播加载完成状态
          notifyLoadingComplete();
        },
      });
    }, 900);
  };

  // 渲染 LOADING... 文字，将三个点分别用 span 包裹
  const renderLoadingText = () => {
    if (loadingText === "LOADING...") {
      return (
        <>
          LOADING
          <span className="loading-dots">
            <span style={{ animationDelay: "0.2s" }}>.</span>
            <span style={{ animationDelay: "0.3s" }}>.</span>
            <span style={{ animationDelay: "0.4s" }}>.</span>
          </span>
        </>
      );
    }

    return (
      <>
        LOAD{" "}
        <span
          style={{
            background:
              "linear-gradient(90deg, var(--color-foreground), var(--color-primary))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          COMPLETED.
        </span>
      </>
    );
  };

  return (
    <>
      <PageLoadManager onLoadComplete={handlePageLoadComplete} />
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] bg-background pointer-events-none flex items-center justify-center uppercase"
        style={overlayStyle}
      >
        <div
          className="border-foreground border-y flex flex-col items-start"
          style={{ paddingTop: "20px", paddingBottom: "20px" }}
        >
          {/* 站点名称 */}
          <span
            className="font-bold text-foreground whitespace-nowrap"
            style={{
              fontSize: "clamp(36px, 8vw, 72px)",
              lineHeight: "1",
              marginBottom: "4px",
            }}
          >
            {siteName}
          </span>

          {/* 加载状态文字，带渐变效果 */}
          {/* 使用 grid 布局，确保两个状态的文字占据相同的空间 */}
          <div className="grid">
            <div className="relative" style={{ gridArea: "1 / 1" }}>
              {/* 隐藏的参考元素，确保容器宽度至少为 "LOAD COMPLETED." 的宽度 */}
              <p
                className="font-bold text-foreground invisible whitespace-nowrap"
                style={{ fontSize: "clamp(28px, 6vw, 56px)", lineHeight: "1" }}
                aria-hidden="true"
              >
                LOAD COMPLETED.
              </p>
            </div>
            <div style={{ gridArea: "1 / 1" }}>
              <AutoTransition type="fade" duration={0.3} initial={false}>
                <p
                  key={loadingText}
                  className="font-bold text-foreground whitespace-nowrap"
                  style={{
                    fontSize: "clamp(28px, 6vw, 56px)",
                    lineHeight: "1",
                  }}
                >
                  {renderLoadingText()}
                </p>
              </AutoTransition>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
