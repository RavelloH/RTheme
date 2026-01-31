"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useMobile } from "@/hooks/use-mobile";

interface GSAPHorizontalScrollProps {
  children: ReactNode;
  className?: string;
  scrollSpeed?: number;
  enableParallax?: boolean;
  enableFadeElements?: boolean;
  enableLineReveal?: boolean;
  snapToElements?: boolean;
  forceNativeScroll?: boolean;
}

const SPACE_REGEX = /^\s+$/;

export default function HorizontalScroll({
  children,
  className = "",
  scrollSpeed = 1,
  enableParallax = false,
  enableFadeElements = false,
  enableLineReveal = false,
  forceNativeScroll = false,
}: GSAPHorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const targetXRef = useRef(0);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  // 使用 useMobile Hook 检测移动设备
  const isMobile = useMobile();

  // 触摸拖动相关状态
  const touchStateRef = useRef({
    isStarted: false,
    startX: 0,
    startY: 0,
    startTargetX: 0,
    currentX: 0,
    velocity: 0,
    lastTime: 0,
    direction: 0,
    isDragging: false,
  });

  useEffect(() => {
    if (!forceNativeScroll || isMobile) return;
    const content = contentRef.current;
    if (!content) return;

    // 原生滚动模式下的平滑插值
    const smoothScrollState = {
      targetScrollLeft: content.scrollLeft,
      currentScrollLeft: content.scrollLeft,
      isAnimating: false,
    };

    // 检查是否在垂直滚动的子元素内
    const shouldIgnoreScroll = (
      target: HTMLElement,
      deltaY: number,
    ): boolean => {
      let element: HTMLElement | null = target;
      while (element && element !== content) {
        const style = window.getComputedStyle(element);
        const hasVerticalScroll =
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          element.scrollHeight > element.clientHeight;
        if (hasVerticalScroll) {
          const isScrollingDown = deltaY > 0;
          const isScrollingUp = deltaY < 0;
          const isAtTop = element.scrollTop === 0;
          const isAtBottom =
            element.scrollTop + element.clientHeight >=
            element.scrollHeight - 1;
          if ((isScrollingDown && !isAtBottom) || (isScrollingUp && !isAtTop)) {
            return true;
          }
        }
        element = element.parentElement;
      }
      return false;
    };

    // 动画循环：使用插值平滑过渡
    let animationFrameId: number | null = null;
    const animateScroll = () => {
      const diff =
        smoothScrollState.targetScrollLeft -
        smoothScrollState.currentScrollLeft;

      // 如果差距很小，直接设置目标值并停止动画
      if (Math.abs(diff) < 0.1) {
        smoothScrollState.currentScrollLeft =
          smoothScrollState.targetScrollLeft;
        content.scrollLeft = smoothScrollState.targetScrollLeft;
        smoothScrollState.isAnimating = false;
        return;
      }

      // 使用插值系数 0.1 实现平滑过渡
      smoothScrollState.currentScrollLeft += diff * 0.1;
      content.scrollLeft = smoothScrollState.currentScrollLeft;

      animationFrameId = requestAnimationFrame(animateScroll);
    };

    const handleWheel = (e: WheelEvent) => {
      // 如果已经是水平滚动（如触控板手势），则不干预
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // 检查是否应该忽略滚动
      if (shouldIgnoreScroll(e.target as HTMLElement, e.deltaY)) return;

      e.preventDefault();

      // 同步当前滚动位置（处理手动拖动滚动条的情况）
      if (
        Math.abs(content.scrollLeft - smoothScrollState.currentScrollLeft) > 1
      ) {
        smoothScrollState.targetScrollLeft = content.scrollLeft;
        smoothScrollState.currentScrollLeft = content.scrollLeft;
      }

      // 更新目标滚动位置
      smoothScrollState.targetScrollLeft += e.deltaY * scrollSpeed;

      // 限制在有效范围内
      const maxScrollLeft = content.scrollWidth - content.clientWidth;
      smoothScrollState.targetScrollLeft = Math.max(
        0,
        Math.min(maxScrollLeft, smoothScrollState.targetScrollLeft),
      );

      // 启动动画循环
      if (!smoothScrollState.isAnimating) {
        smoothScrollState.isAnimating = true;
        animateScroll();
      }
    };

    content.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      content.removeEventListener("wheel", handleWheel);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [forceNativeScroll, isMobile, scrollSpeed]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) return;

    // 移动设备或强制原生滚动时直接返回
    if (isMobile || forceNativeScroll) {
      return;
    }

    // 初始化位置
    const initialX = (gsap.getProperty(content, "x") as number) || 0;
    targetXRef.current = initialX;

    // 存储清理函数
    const cleanupFunctions: (() => void)[] = [];

    // 创建 GSAP 上下文
    const ctx = gsap.context(() => {
      // -----------------------------------------------------------------------
      // 性能优化: 预先测量和缓存元素位置，避免在 ticker/scroll 中频繁读取 DOM
      // -----------------------------------------------------------------------
      const cache = {
        containerWidth: 0,
        parallax: [] as {
          el: Element;
          speed: number;
          initialX: number;
          leftOffset: number; // 相对于 content 左边缘的偏移
          width: number;
          hasEntered: boolean;
          entryScrollX: number;
        }[],
        fade: [] as {
          el: Element;
          leftOffset: number;
          width: number;
        }[],
        wordFade: [] as {
          el: Element;
          leftOffset: number;
          width: number;
          spans: HTMLSpanElement[];
          isFullyRevealed: boolean;
        }[],
        charFade: [] as {
          el: Element;
          leftOffset: number;
          width: number;
          spans: HTMLSpanElement[];
          isFullyRevealed: boolean;
        }[],
        lineReveal: [] as {
          el: Element;
          leftOffset: number;
          width: number;
          lines: HTMLElement[];
          isFullyRevealed: boolean;
        }[],
      };

      // DOM 预处理：仅执行一次 (拆分文本等)
      const initDOM = () => {
        if (enableFadeElements) {
          content.querySelectorAll("[data-fade]").forEach((el) => {
            void gsap.set(el, {
              opacity: 0,
              clearProps: "transform,opacity",
              force3D: true,
            });
          });
          // Word Fade Split
          content.querySelectorAll("[data-fade-word]").forEach((element) => {
            if (element.hasAttribute("data-processed")) return;
            const originalText = element.textContent || "";
            const words = originalText
              .split(/(\s+)/)
              .filter((word) => word.length > 0);
            element.innerHTML = "";
            words.forEach((word) => {
              const span = document.createElement("span");
              span.textContent = word;
              span.style.display = "inline-block";
              if (SPACE_REGEX.test(word)) {
                span.style.width = word.length * 0.25 + "em";
                span.style.minWidth = word.length * 0.25 + "em";
              }
              element.appendChild(span);
              // Init style
              if (SPACE_REGEX.test(word)) {
                gsap.set(span, { opacity: 0, transformOrigin: "50% 100%" });
              } else {
                gsap.set(span, {
                  opacity: 0,
                  y: 10,
                  scale: 0.8,
                  transformOrigin: "50% 100%",
                });
              }
            });
            element.setAttribute("data-processed", "true");
          });

          // Char Fade Split
          content.querySelectorAll("[data-fade-char]").forEach((element) => {
            if (element.hasAttribute("data-processed")) return;
            const originalText = element.textContent || "";
            const chars = originalText.split("");
            element.innerHTML = "";
            chars.forEach((char) => {
              const span = document.createElement("span");
              span.textContent = char;
              span.style.display = "inline-block";
              if (char === " ") span.style.width = "0.25em";
              element.appendChild(span);
              // Init style
              gsap.set(span, {
                opacity: 0,
                y: 15,
                rotationY: 90,
                transformOrigin: "50% 50%",
              });
            });
            element.setAttribute("data-processed", "true");
          });
        }

        if (enableLineReveal) {
          content.querySelectorAll("[data-line-reveal]").forEach((element) => {
            if (element.hasAttribute("data-processed")) return;
            // (Keeping original split logic simplified for brevity but functionally identical)
            if (element.children.length === 0) {
              const text = element.textContent || "";
              const textLines = text
                .split("\n")
                .filter((line) => line.trim().length > 0);
              element.innerHTML = "";
              textLines.forEach((lineText, index) => {
                const span = document.createElement("span");
                span.textContent = lineText;
                span.style.display = "block";
                element.appendChild(span);
                if (index < textLines.length - 1) {
                  const empty = document.createElement("span");
                  empty.innerHTML = "&nbsp;";
                  empty.style.display = "block";
                  empty.style.height = "0.1em";
                  element.appendChild(empty);
                }
              });
            } else {
              // Ensure empty children have height
              Array.from(element.children).forEach((child) => {
                const c = child as HTMLElement;
                if (!c.textContent?.trim()) {
                  c.innerHTML = "&nbsp;";
                  c.style.display = "block";
                  c.style.height = "1em";
                }
              });
            }
            // Init style
            Array.from(element.children).forEach((line) => {
              gsap.set(line, {
                opacity: 0,
                y: 20,
                rotationX: -90,
                transformOrigin: "50% 100%",
              });
            });
            element.setAttribute("data-processed", "true");
          });
        }
      };
      initDOM();

      // 测量所有元素位置 (在 Init 和 Resize 时调用)
      const measure = () => {
        const containerRect = container.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        cache.containerWidth = containerRect.width;

        // 当前 content 的 X 偏移 (用于还原元素相对 content 的原始位置)
        // 注意：contentRect.left 已经包含了 transform 变换
        // 相对位置 = (元素屏幕位置 - content 屏幕位置)
        // 这个相对位置在滚动过程中是不变的

        if (enableParallax) {
          cache.parallax = [];
          content.querySelectorAll("[data-parallax]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            // 重置 transform 以获取准确的原始位置?
            // 不，我们希望基于当前布局。
            // 假设初始状态下没有额外的 transform，或者我们基于 layout flow。
            // 这里为了简单，我们计算它相对于 content 左边缘的距离。
            const leftOffset = rect.left - contentRect.left;

            cache.parallax.push({
              el: element,
              speed: parseFloat(element.getAttribute("data-parallax") || "0.5"),
              initialX: (gsap.getProperty(element, "x") as number) || 0,
              leftOffset,
              width: rect.width,
              hasEntered: false,
              entryScrollX: 0,
            });
          });
        }

        if (enableFadeElements) {
          cache.fade = [];
          content.querySelectorAll("[data-fade]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.fade.push({
              el: element,
              leftOffset: rect.left - contentRect.left,
              width: rect.width,
            });
          });

          cache.wordFade = [];
          content.querySelectorAll("[data-fade-word]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.wordFade.push({
              el: element,
              leftOffset: rect.left - contentRect.left,
              width: rect.width,
              spans: Array.from(element.children) as HTMLSpanElement[],
              isFullyRevealed: false,
            });
          });

          cache.charFade = [];
          content.querySelectorAll("[data-fade-char]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.charFade.push({
              el: element,
              leftOffset: rect.left - contentRect.left,
              width: rect.width,
              spans: Array.from(element.children) as HTMLSpanElement[],
              isFullyRevealed: false,
            });
          });
        }

        if (enableLineReveal) {
          cache.lineReveal = [];
          content.querySelectorAll("[data-line-reveal]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.lineReveal.push({
              el: element,
              leftOffset: rect.left - contentRect.left,
              width: rect.width,
              lines: Array.from(element.children) as HTMLElement[],
              isFullyRevealed: false,
            });
          });
        }
      };

      measure();

      // -----------------------------------------------------------------------
      // 动画循环
      // -----------------------------------------------------------------------
      let lastX = -999999;

      const updateLoop = () => {
        const currentX = gsap.getProperty(content, "x") as number;

        // 性能优化：位置未改变时不重复计算 (除非强制刷新，这里省略)
        if (Math.abs(currentX - lastX) < 0.01) {
          return;
        }
        lastX = currentX;

        const { containerWidth } = cache;

        // --- Update Parallax ---
        if (enableParallax) {
          const viewportPreparationZone = containerWidth;
          cache.parallax.forEach((item) => {
            // 计算当前屏幕位置: contentX + itemOffset
            const currentLeft = currentX + item.leftOffset;
            const currentRight = currentLeft + item.width;

            const isInViewportArea =
              currentLeft < viewportPreparationZone && currentRight > 0;

            if (isInViewportArea) {
              if (!item.hasEntered) {
                item.hasEntered = true;
                item.entryScrollX = currentX;
                item.initialX = (gsap.getProperty(item.el, "x") as number) || 0;
              }

              const relativeMovement = currentX - item.entryScrollX;
              const parallaxX = item.initialX + relativeMovement * item.speed;
              gsap.set(item.el, { x: parallaxX });
            } else if (currentLeft >= viewportPreparationZone) {
              if (item.hasEntered) {
                item.hasEntered = false;
                item.entryScrollX = 0;
              }
            }
          });
        }

        // --- Update Fade Elements ---
        if (enableFadeElements) {
          const animationStartX = containerWidth;
          const animationEndX = containerWidth * 0.8;
          const totalDistance = animationStartX - animationEndX;

          cache.fade.forEach((item) => {
            const currentLeft = currentX + item.leftOffset;
            const center = currentLeft + item.width / 2;
            let progress = 0;

            if (center <= animationEndX) progress = 1;
            else if (center >= animationStartX) progress = 0;
            else progress = (animationStartX - center) / totalDistance;

            gsap.to(item.el, {
              opacity: Math.max(0, Math.min(1, progress)),
              duration: 0.1,
              ease: "none",
              overwrite: true,
            });
          });

          // --- Update Word Fade ---
          const wordTriggerPoint = containerWidth * 0.8;
          cache.wordFade.forEach((item) => {
            const currentLeft = currentX + item.leftOffset;
            const currentRight = currentLeft + item.width;

            if (currentRight <= wordTriggerPoint) {
              if (!item.isFullyRevealed) {
                item.isFullyRevealed = true;
                item.spans.forEach((span, i) => {
                  gsap.to(span, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    delay: i * 0.05,
                    ease: "back.out(1.2)",
                    overwrite: true,
                  });
                });
              }
            } else if (currentLeft <= containerWidth) {
              item.isFullyRevealed = false;
              // 部分可见
              const visibleProgress = Math.max(
                0,
                Math.min(1, (containerWidth - currentLeft) / item.width),
              );
              const count = Math.floor(visibleProgress * item.spans.length);

              item.spans.forEach((span, i) => {
                const isSpace = SPACE_REGEX.test(span.textContent || "");
                if (i < count) {
                  gsap.to(span, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    ease: "back.out(1.2)",
                    overwrite: true,
                  });
                } else {
                  gsap.to(span, {
                    opacity: 0,
                    y: isSpace ? 0 : 10,
                    scale: isSpace ? 1 : 0.8,
                    duration: 0.2,
                    ease: "power2.out",
                    overwrite: true,
                  });
                }
              });
            } else {
              item.isFullyRevealed = false;
              item.spans.forEach((span) => {
                const isSpace = SPACE_REGEX.test(span.textContent || "");
                gsap.to(span, {
                  opacity: 0,
                  y: isSpace ? 0 : 10,
                  scale: isSpace ? 1 : 0.8,
                  duration: 0.2,
                  ease: "power2.out",
                  overwrite: true,
                });
              });
            }
          });

          // --- Update Char Fade ---
          const charTriggerPoint = containerWidth * 0.75;
          cache.charFade.forEach((item) => {
            const currentLeft = currentX + item.leftOffset;
            const currentRight = currentLeft + item.width;

            if (currentRight <= charTriggerPoint) {
              if (!item.isFullyRevealed) {
                item.isFullyRevealed = true;
                item.spans.forEach((span, i) => {
                  gsap.to(span, {
                    opacity: 1,
                    y: 0,
                    rotationY: 0,
                    duration: 0.3,
                    delay: i * 0.02,
                    ease: "back.out(1.1)",
                    overwrite: true,
                  });
                });
              }
            } else if (currentLeft <= containerWidth) {
              item.isFullyRevealed = false;
              const visibleProgress = Math.max(
                0,
                Math.min(1, (containerWidth - currentLeft) / item.width),
              );
              const count = Math.floor(visibleProgress * item.spans.length);
              item.spans.forEach((span, i) => {
                if (i < count) {
                  gsap.to(span, {
                    opacity: 1,
                    y: 0,
                    rotationY: 0,
                    duration: 0.3,
                    ease: "back.out(1.1)",
                    overwrite: true,
                  });
                } else {
                  gsap.to(span, {
                    opacity: 0,
                    y: 15,
                    rotationY: 90,
                    duration: 0.15,
                    ease: "power2.out",
                    overwrite: true,
                  });
                }
              });
            } else {
              item.isFullyRevealed = false;
              item.spans.forEach((span) => {
                gsap.to(span, {
                  opacity: 0,
                  y: 15,
                  rotationY: 90,
                  duration: 0.15,
                  ease: "power2.out",
                  overwrite: true,
                });
              });
            }
          });
        }

        // --- Update Line Reveal ---
        if (enableLineReveal) {
          const lineTriggerPoint = containerWidth * 0.8;
          cache.lineReveal.forEach((item) => {
            const currentLeft = currentX + item.leftOffset;
            const currentRight = currentLeft + item.width;

            if (currentRight <= lineTriggerPoint) {
              if (!item.isFullyRevealed) {
                item.isFullyRevealed = true;
                item.lines.forEach((line, i) => {
                  gsap.to(line, {
                    opacity: 1,
                    y: 0,
                    rotationX: 0,
                    duration: 0.6,
                    delay: i * 0.1,
                    ease: "back.out(1.7)",
                    overwrite: true,
                  });
                });
              }
            } else if (currentLeft <= containerWidth) {
              item.isFullyRevealed = false;
              const visibleProgress = Math.max(
                0,
                Math.min(1, (containerWidth - currentLeft) / item.width),
              );
              const count = Math.floor(visibleProgress * item.lines.length);
              item.lines.forEach((line, i) => {
                if (i < count) {
                  gsap.to(line, {
                    opacity: 1,
                    y: 0,
                    rotationX: 0,
                    duration: 0.6,
                    ease: "back.out(1.7)",
                    overwrite: true,
                  });
                } else {
                  gsap.to(line, {
                    opacity: 0,
                    y: 20,
                    rotationX: -90,
                    duration: 0.3,
                    ease: "power2.out",
                    overwrite: true,
                  });
                }
              });
            } else {
              item.isFullyRevealed = false;
              item.lines.forEach((line) => {
                gsap.to(line, {
                  opacity: 0,
                  y: 20,
                  rotationX: -90,
                  duration: 0.3,
                  ease: "power2.out",
                  overwrite: true,
                });
              });
            }
          });
        }
      };

      // 注册单个 ticker 函数
      gsap.ticker.add(updateLoop);
      cleanupFunctions.push(() => gsap.ticker.remove(updateLoop));

      // 窗口大小变化时重新测量
      window.addEventListener("resize", measure);
      cleanupFunctions.push(() =>
        window.removeEventListener("resize", measure),
      );

      // -----------------------------------------------------------------------
      // 事件处理
      // -----------------------------------------------------------------------
      const animateToTarget = () => {
        if (animationRef.current) animationRef.current.kill();
        const currentX = gsap.getProperty(content, "x") as number;
        const targetX = targetXRef.current;
        if (Math.abs(targetX - currentX) < 0.1) return;

        animationRef.current = gsap.to(content, {
          x: targetX,
          duration: 1,
          ease: "power3.out",
          overwrite: false,
        });
      };

      const handleWheel = (e: WheelEvent) => {
        // ... (Keep existing scroll logic)
        const target = e.target as HTMLElement;
        let element: HTMLElement | null = target;
        while (element && element !== container) {
          const style = window.getComputedStyle(element);
          const hasVerticalScroll =
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            element.scrollHeight > element.clientHeight;
          if (hasVerticalScroll) {
            const isScrollingDown = e.deltaY > 0;
            const isScrollingUp = e.deltaY < 0;
            const isAtTop = element.scrollTop === 0;
            const isAtBottom =
              element.scrollTop + element.clientHeight >=
              element.scrollHeight - 1;
            if (
              (isScrollingDown && !isAtBottom) ||
              (isScrollingUp && !isAtTop)
            ) {
              return;
            }
          }
          element = element.parentElement;
        }

        e.preventDefault();
        const deltaX = e.deltaY * scrollSpeed;
        const newTargetX = targetXRef.current - deltaX;
        const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
        targetXRef.current = Math.max(maxScrollLeft, Math.min(0, newTargetX));
        animateToTarget();
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        if (!touch) return;
        touchStateRef.current = {
          isStarted: true,
          startX: touch.clientX,
          startY: touch.clientY,
          startTargetX: targetXRef.current,
          currentX: touch.clientX,
          velocity: 0,
          lastTime: Date.now(),
          direction: 0,
          isDragging: false,
        };
        if (animationRef.current) animationRef.current.kill();
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!touchStateRef.current.isStarted || e.touches.length === 0) return;
        const touch = e.touches[0];
        if (!touch) return;
        const now = Date.now();
        if (now - touchStateRef.current.lastTime < 16) return;

        const deltaX = touch.clientX - touchStateRef.current.currentX;
        const deltaY = touch.clientY - touchStateRef.current.startY;
        const horizontalDistance = Math.abs(
          touch.clientX - touchStateRef.current.startX,
        );
        const verticalDistance = Math.abs(deltaY);

        if (horizontalDistance > 10 && horizontalDistance > verticalDistance) {
          e.preventDefault();
          touchStateRef.current.isDragging = true;
          touchStateRef.current.velocity =
            deltaX / (now - touchStateRef.current.lastTime);
          const newTargetX =
            touchStateRef.current.startTargetX +
            (touch.clientX - touchStateRef.current.startX);
          const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
          targetXRef.current = Math.max(maxScrollLeft, Math.min(0, newTargetX));
          gsap.set(content, { x: targetXRef.current });
          touchStateRef.current.currentX = touch.clientX;
          touchStateRef.current.lastTime = now;
        }
      };

      const handleTouchEnd = () => {
        if (!touchStateRef.current.isStarted) return;
        touchStateRef.current.isStarted = false;
        if (touchStateRef.current.isDragging) {
          const momentum = touchStateRef.current.velocity * 300;
          let finalX = targetXRef.current + momentum;
          const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
          finalX = Math.max(maxScrollLeft, Math.min(0, finalX));
          targetXRef.current = finalX;
          animateToTarget();
        }
        touchStateRef.current.isDragging = false;
      };

      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      container.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      container.addEventListener("touchend", handleTouchEnd, {
        passive: false,
      });

      // Keydown optimization: only attach if necessary? No, document level is fine but ensure clean up.
      const handleKeyDown = (e: KeyboardEvent) => {
        // ... (Logic same as original)
        const target = e.target as HTMLElement;
        const isInMonacoEditor =
          target.closest('[data-monaco-editor="true"]') ||
          target.closest(".monaco-editor") ||
          target.classList?.contains("monaco-editor");

        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.getAttribute("contenteditable") === "true" ||
          isInMonacoEditor
        ) {
          return;
        }

        let scrollDelta = 0;
        if (
          e.code === "Space" ||
          e.code === "ArrowRight" ||
          e.code === "ArrowDown"
        ) {
          e.preventDefault();
          scrollDelta = -100;
        } else if (
          (e.code === "Space" && e.shiftKey) ||
          e.code === "ArrowLeft" ||
          e.code === "ArrowUp"
        ) {
          e.preventDefault();
          scrollDelta = 100;
        }

        if (scrollDelta !== 0) {
          const newTargetX = targetXRef.current + scrollDelta * scrollSpeed;
          const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
          targetXRef.current = Math.max(maxScrollLeft, Math.min(0, newTargetX));
          animateToTarget();
        }
      };

      document.addEventListener("keydown", handleKeyDown, { passive: false });

      cleanupFunctions.push(() => {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("keydown", handleKeyDown);
      });
    }, container);

    return () => {
      if (animationRef.current) animationRef.current.kill();
      ctx.revert();
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [
    scrollSpeed,
    enableParallax,
    enableFadeElements,
    enableLineReveal,
    isMobile,
    forceNativeScroll,
  ]);

  // Mobile optimization
  useEffect(() => {
    if (!isMobile) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const cleanupFunctions: (() => void)[] = [];
    const initTimeout = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Cache mechanism for mobile (vertical scroll)
        const cache = {
          fade: [] as { el: Element; topOffset: number; height: number }[],
          wordFade: [] as {
            el: Element;
            topOffset: number;
            height: number;
            spans: HTMLSpanElement[];
          }[],
          charFade: [] as {
            el: Element;
            topOffset: number;
            height: number;
            spans: HTMLSpanElement[];
          }[],
          lineReveal: [] as {
            el: Element;
            topOffset: number;
            height: number;
            lines: HTMLElement[];
          }[],
        };

        const initDOM = () => {
          // Split logic mirrors desktop... can extract to shared function but keeping inline for now
          if (enableFadeElements) {
            content.querySelectorAll("[data-fade]").forEach((el) => {
              void gsap.set(el, {
                opacity: 0,
                clearProps: "transform,opacity",
                force3D: true,
              });
            });

            // ... Split logic for word/char ... (Re-implementing split logic here is redundant if it ran in desktop effect, BUT isMobile changes, causing unmount/remount, so we must run it.)
            // However, split modifies DOM. If we switch mobile->desktop->mobile, we might double split if not careful.
            // The "data-processed" check handles this.
            content.querySelectorAll("[data-fade-word]").forEach((element) => {
              if (element.hasAttribute("data-processed")) return;
              // ... same split logic
              const originalText = element.textContent || "";
              const words = originalText
                .split(/(\s+)/)
                .filter((word) => word.length > 0);
              element.innerHTML = "";
              words.forEach((word) => {
                const span = document.createElement("span");
                span.textContent = word;
                span.style.display = "inline-block";
                if (SPACE_REGEX.test(word)) {
                  span.style.width = word.length * 0.25 + "em";
                  span.style.minWidth = word.length * 0.25 + "em";
                }
                element.appendChild(span);
                if (SPACE_REGEX.test(word)) gsap.set(span, { opacity: 0 });
                else gsap.set(span, { opacity: 0, y: 10, scale: 0.8 });
              });
              element.setAttribute("data-processed", "true");
            });

            // ... same char split logic
            content.querySelectorAll("[data-fade-char]").forEach((element) => {
              if (element.hasAttribute("data-processed")) return;
              const chars = (element.textContent || "").split("");
              element.innerHTML = "";
              chars.forEach((char) => {
                const span = document.createElement("span");
                span.textContent = char;
                span.style.display = "inline-block";
                if (char === " ") span.style.width = "0.25em";
                element.appendChild(span);
                gsap.set(span, { opacity: 0, y: 15, rotationY: 90 });
              });
              element.setAttribute("data-processed", "true");
            });
          }

          // Line reveal split
          if (enableLineReveal) {
            content
              .querySelectorAll("[data-line-reveal]")
              .forEach((element) => {
                if (element.hasAttribute("data-processed")) return;
                if (element.children.length === 0) {
                  const lines = (element.textContent || "")
                    .split("\n")
                    .filter((l) => l.trim().length > 0);
                  element.innerHTML = "";
                  lines.forEach((l) => {
                    const s = document.createElement("span");
                    s.textContent = l;
                    s.style.display = "block";
                    element.appendChild(s);
                  });
                }
                // Init style
                Array.from(element.children).forEach((c) => {
                  void gsap.set(c, { opacity: 0, y: 20, rotationX: -90 });
                });
                element.setAttribute("data-processed", "true");
              });
          }
        };
        initDOM();

        const measure = () => {
          // Mobile measures vertical top relative to document
          // Or relative to content, but we use window.scrollY
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

          if (enableFadeElements) {
            cache.fade = [];
            content.querySelectorAll("[data-fade]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.fade.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
              });
            });

            cache.wordFade = [];
            content.querySelectorAll("[data-fade-word]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.wordFade.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
                spans: Array.from(el.children) as HTMLSpanElement[],
              });
            });

            cache.charFade = [];
            content.querySelectorAll("[data-fade-char]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.charFade.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
                spans: Array.from(el.children) as HTMLSpanElement[],
              });
            });
          }
          if (enableLineReveal) {
            cache.lineReveal = [];
            content.querySelectorAll("[data-line-reveal]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.lineReveal.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
                lines: Array.from(el.children) as HTMLElement[],
              });
            });
          }
        };
        measure(); // Initial measure

        const onScroll = () => {
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          const animStart = scrollTop + windowHeight;
          const animEnd = scrollTop + windowHeight * 0.9;
          const totalDist = animStart - animEnd;

          // Update Fade
          if (enableFadeElements) {
            cache.fade.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              let progress = 0;
              if (center <= animEnd) progress = 1;
              else if (center >= animStart) progress = 0;
              else progress = (animStart - center) / totalDist;

              gsap.to(item.el, {
                opacity: progress,
                duration: 0.3,
                ease: "power2.out",
                overwrite: true,
              });
            });

            // Update Word Fade
            cache.wordFade.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              let progress = 0;
              if (center <= animEnd) progress = 1;
              else if (center >= animStart) progress = 0;
              else progress = (animStart - center) / totalDist;

              const count = Math.floor(progress * item.spans.length);
              item.spans.forEach((span, i) => {
                const isSpace = SPACE_REGEX.test(span.textContent || "");
                if (i < count) {
                  if (isSpace) {
                    gsap.to(span, {
                      opacity: 1,
                      duration: 0.3,
                      ease: "power2.out",
                      overwrite: true,
                    });
                  } else {
                    gsap.to(span, {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      duration: 0.3,
                      ease: "back.out(1.2)",
                      overwrite: true,
                    });
                  }
                } else {
                  if (isSpace) {
                    gsap.to(span, {
                      opacity: 0,
                      duration: 0.2,
                      overwrite: true,
                    });
                  } else {
                    gsap.to(span, {
                      opacity: 0,
                      y: 10,
                      scale: 0.8,
                      duration: 0.2,
                      overwrite: true,
                    });
                  }
                }
              });
            });

            // Char Fade
            cache.charFade.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              let progress = 0;
              if (center <= animEnd) progress = 1;
              else if (center >= animStart) progress = 0;
              else progress = (animStart - center) / totalDist;

              const count = Math.floor(progress * item.spans.length);
              item.spans.forEach((span, i) => {
                if (i < count) {
                  gsap.to(span, {
                    opacity: 1,
                    y: 0,
                    rotationY: 0,
                    duration: 0.3,
                    ease: "power2.out",
                    overwrite: true,
                  });
                } else {
                  gsap.to(span, {
                    opacity: 0,
                    y: 15,
                    rotationY: 90,
                    duration: 0.3,
                    overwrite: true,
                  });
                }
              });
            });
          }

          if (enableLineReveal) {
            cache.lineReveal.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              let progress = 0;
              if (center <= animEnd) progress = 1;
              else if (center >= animStart) progress = 0;
              else progress = (animStart - center) / totalDist;

              const count = Math.floor(progress * item.lines.length);
              item.lines.forEach((line, i) => {
                if (i < count) {
                  gsap.to(line, {
                    opacity: 1,
                    y: 0,
                    rotationX: 0,
                    duration: 0.4,
                    overwrite: true,
                  });
                } else {
                  gsap.to(line, {
                    opacity: 0,
                    y: 20,
                    rotationX: -90,
                    duration: 0.3,
                    overwrite: true,
                  });
                }
              });
            });
          }
        };

        const rafScroll = () => requestAnimationFrame(onScroll);
        window.addEventListener("scroll", rafScroll, { passive: true });
        window.addEventListener("resize", measure); // Measure on resize for mobile too
        cleanupFunctions.push(() => {
          window.removeEventListener("scroll", rafScroll);
          window.removeEventListener("resize", measure);
        });

        onScroll(); // Init
      });
      cleanupFunctions.push(() => ctx.revert());
    }, 500); // 延迟500ms初始化

    cleanupFunctions.push(() => clearTimeout(initTimeout));
    return () => cleanupFunctions.forEach((c) => c());
  }, [isMobile, enableFadeElements, enableLineReveal]);

  return (
    <div ref={containerRef} className={"overflow-hidden " + className}>
      <div
        ref={contentRef}
        className={`${isMobile || forceNativeScroll ? "flex overflow-x-auto" : "flex"} h-full will-change-transform`}
      >
        {children}
      </div>
    </div>
  );
}
