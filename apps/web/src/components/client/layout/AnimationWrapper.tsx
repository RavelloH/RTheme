"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

import { useEvent } from "@/hooks/use-event";
import { useMobile } from "@/hooks/use-mobile";
import type { HorizontalScrollProgressMessage } from "@/types/broadcast-messages";
import type { HorizontalScrollEventMap } from "@/types/horizontal-scroll-events";

export interface HorizontalScrollAnimationFeatureProps {
  enableParallax?: boolean;
  enableFadeElements?: boolean;
  enableLineReveal?: boolean;
}

interface HorizontalScrollAnimationWrapperProps
  extends HorizontalScrollAnimationFeatureProps {
  children: ReactNode;
  className?: string;
}

const SPACE_REGEX = /^\s+$/;
const EPSILON = 0.001;
const WORD_TOKEN_FALLBACK_REGEX =
  /(\s+|[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]|[^\s\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]+)/g;
const WORD_SEGMENTER =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;
const GRAPHEME_SEGMENTER =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
const LINE_TOP_EPSILON = 1;
const INLINE_DISPLAY_VALUES = new Set(["inline", "inline-block", "contents"]);
const NON_AUTO_LINE_REVEAL_SELECTOR =
  "a,button,input,textarea,select,option,label,video,audio,iframe,canvas,svg,table,pre,code";

type RevealPhase = "before" | "partial" | "after";
type LineRevealMode = "auto" | "manual";

const lineRevealModeMap = new WeakMap<Element, LineRevealMode>();
const lineRevealSourceTextMap = new WeakMap<Element, string>();

function splitTextForWordFade(text: string): string[] {
  if (!text) return [];

  if (WORD_SEGMENTER) {
    const segments = Array.from(
      WORD_SEGMENTER.segment(text),
      ({ segment }) => segment,
    ).filter((segment) => segment.length > 0);
    if (segments.length > 0) return segments;
  }

  const fallbackTokens = text.match(WORD_TOKEN_FALLBACK_REGEX);
  return fallbackTokens
    ? fallbackTokens.filter((segment) => segment.length > 0)
    : [];
}

function splitTextToGraphemes(text: string): string[] {
  if (!text) return [];

  if (GRAPHEME_SEGMENTER) {
    const graphemes = Array.from(
      GRAPHEME_SEGMENTER.segment(text),
      ({ segment }) => segment,
    );
    if (graphemes.length > 0) return graphemes;
  }

  return Array.from(text);
}

function shouldAutoSplitLineRevealElement(element: Element): boolean {
  if (element.hasAttribute("data-line-reveal-manual")) return false;
  if (element.hasAttribute("data-line-reveal-auto")) return true;
  if (element.querySelector(NON_AUTO_LINE_REVEAL_SELECTOR)) return false;

  const children = Array.from(element.children) as HTMLElement[];
  if (children.length === 0) return true;

  return children.every((child) => {
    const display = window.getComputedStyle(child).display;
    return INLINE_DISPLAY_VALUES.has(display);
  });
}

function resolveLineRevealMode(element: Element): LineRevealMode {
  const cachedMode = lineRevealModeMap.get(element);
  if (cachedMode) return cachedMode;

  const mode = shouldAutoSplitLineRevealElement(element) ? "auto" : "manual";
  lineRevealModeMap.set(element, mode);
  return mode;
}

function normalizeManualLineRevealChildren(element: HTMLElement): void {
  if (element.children.length === 0) {
    const lines = (element.textContent || "").split(/\r?\n/);
    element.innerHTML = "";
    lines.forEach((lineText) => {
      const span = document.createElement("span");
      span.style.display = "block";
      if (lineText.length === 0) {
        span.innerHTML = "&nbsp;";
        span.style.height = "1em";
      } else {
        span.textContent = lineText;
      }
      element.appendChild(span);
    });
    return;
  }

  Array.from(element.children).forEach((child) => {
    const line = child as HTMLElement;
    if (!line.textContent?.trim()) {
      line.innerHTML = "&nbsp;";
      line.style.display = "block";
      line.style.height = "1em";
      return;
    }
    line.style.display = "block";
  });
}

function splitElementIntoVisualLines(element: HTMLElement): void {
  const sourceText =
    lineRevealSourceTextMap.get(element) ?? (element.textContent || "");
  lineRevealSourceTextMap.set(element, sourceText);

  const graphemes = splitTextToGraphemes(sourceText);
  element.innerHTML = "";

  if (graphemes.length === 0) {
    const emptyLine = document.createElement("span");
    emptyLine.innerHTML = "&nbsp;";
    emptyLine.style.display = "block";
    emptyLine.style.height = "1em";
    element.appendChild(emptyLine);
    return;
  }

  const markers: Array<
    | { kind: "line-break" }
    | { kind: "token"; text: string; span: HTMLSpanElement }
  > = [];

  graphemes.forEach((grapheme) => {
    if (grapheme === "\r") return;
    if (grapheme === "\n") {
      const lineBreak = document.createElement("br");
      element.appendChild(lineBreak);
      markers.push({ kind: "line-break" });
      return;
    }

    const span = document.createElement("span");
    span.textContent = grapheme;
    span.style.whiteSpace = "pre";
    element.appendChild(span);
    markers.push({ kind: "token", text: grapheme, span });
  });

  const lines: string[] = [];
  let currentLine = "";
  let currentTop: number | null = null;
  let endedWithLineBreak = false;

  markers.forEach((marker) => {
    if (marker.kind === "line-break") {
      lines.push(currentLine);
      currentLine = "";
      currentTop = null;
      endedWithLineBreak = true;
      return;
    }

    const tokenTop = marker.span.getBoundingClientRect().top;
    if (currentTop === null) {
      currentTop = tokenTop;
      currentLine += marker.text;
      endedWithLineBreak = false;
      return;
    }

    if (Math.abs(tokenTop - currentTop) > LINE_TOP_EPSILON) {
      lines.push(currentLine);
      currentLine = marker.text;
      currentTop = tokenTop;
      endedWithLineBreak = false;
      return;
    }

    currentLine += marker.text;
    endedWithLineBreak = false;
  });

  if (currentLine.length > 0 || lines.length === 0 || endedWithLineBreak) {
    lines.push(currentLine);
  }

  element.innerHTML = "";
  const fragment = document.createDocumentFragment();
  lines.forEach((lineText) => {
    const line = document.createElement("span");
    line.style.display = "block";
    line.style.whiteSpace = "pre";
    if (lineText.length === 0) {
      line.innerHTML = "&nbsp;";
      line.style.height = "1em";
    } else {
      line.textContent = lineText;
    }
    fragment.appendChild(line);
  });

  element.appendChild(fragment);
}

function prepareLineRevealElement(
  element: Element,
  forceAutoRebuild = false,
): void {
  const target = element as HTMLElement;
  const mode = resolveLineRevealMode(target);
  const isProcessed = target.hasAttribute("data-processed");

  if (mode === "auto") {
    if (!isProcessed) {
      lineRevealSourceTextMap.set(target, target.textContent || "");
      splitElementIntoVisualLines(target);
      return;
    }

    if (forceAutoRebuild) {
      splitElementIntoVisualLines(target);
    }
    return;
  }

  if (!isProcessed) {
    normalizeManualLineRevealChildren(target);
  }
}

function isHorizontalScrollProgressMessage(
  message: unknown,
): message is HorizontalScrollProgressMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<HorizontalScrollProgressMessage>;
  return (
    candidate.type === "horizontal-scroll-progress" &&
    typeof candidate.currentX === "number" &&
    typeof candidate.containerWidth === "number"
  );
}

export default function HorizontalScrollAnimationWrapper({
  children,
  className = "",
  enableParallax = false,
  enableFadeElements = false,
  enableLineReveal = false,
}: HorizontalScrollAnimationWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const desktopHandlerRef = useRef<
    (message: HorizontalScrollProgressMessage) => void
  >(() => {});
  const isMobile = useMobile();
  const horizontalScrollEventStore = useEvent<HorizontalScrollEventMap>();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || isMobile) return;

    const content = wrapper.closest(
      "[data-horizontal-scroll-content]",
    ) as HTMLDivElement | null;
    const container = content?.parentElement as HTMLDivElement | null;
    if (!container || !content) return;

    const cleanupFunctions: Array<() => void> = [];

    const ctx = gsap.context(() => {
      const cache = {
        containerWidth: 0,
        wrapperOffset: 0,
        wrapperWidth: 0,
        parallax: [] as {
          el: Element;
          speed: number;
          initialX: number;
          leftOffset: number;
          width: number;
          hasEntered: boolean;
          entryScrollX: number;
          lastAppliedX: number;
        }[],
        fade: [] as {
          el: Element;
          leftOffset: number;
          width: number;
          lastOpacity: number;
        }[],
        wordFade: [] as {
          el: Element;
          leftOffset: number;
          width: number;
          spans: HTMLSpanElement[];
          isFullyRevealed: boolean;
          lastPhase: RevealPhase;
          lastVisibleCount: number;
        }[],
        charFade: [] as {
          el: Element;
          leftOffset: number;
          width: number;
          spans: HTMLSpanElement[];
          isFullyRevealed: boolean;
          lastPhase: RevealPhase;
          lastVisibleCount: number;
        }[],
        lineReveal: [] as {
          el: Element;
          leftOffset: number;
          width: number;
          lines: HTMLElement[];
          isFullyRevealed: boolean;
          lastPhase: RevealPhase;
          lastVisibleCount: number;
        }[],
      };

      const setupDesktopLineReveal = (forceAutoRebuild = false) => {
        wrapper.querySelectorAll("[data-line-reveal]").forEach((element) => {
          prepareLineRevealElement(element, forceAutoRebuild);
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
      };

      const initDOM = () => {
        if (enableFadeElements) {
          wrapper.querySelectorAll("[data-fade]").forEach((el) => {
            void gsap.set(el, {
              opacity: 0,
              force3D: true,
            });
          });

          wrapper.querySelectorAll("[data-fade-word]").forEach((element) => {
            if (element.hasAttribute("data-processed")) {
              Array.from(element.children).forEach((child) => {
                const span = child as HTMLSpanElement;
                const isSpace = SPACE_REGEX.test(span.textContent || "");
                if (isSpace) {
                  gsap.set(span, {
                    opacity: 0,
                    transformOrigin: "50% 100%",
                  });
                } else {
                  gsap.set(span, {
                    opacity: 0,
                    y: 10,
                    scale: 0.8,
                    transformOrigin: "50% 100%",
                  });
                }
              });
              return;
            }
            const originalText = element.textContent || "";
            const words = splitTextForWordFade(originalText);
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

          wrapper.querySelectorAll("[data-fade-char]").forEach((element) => {
            if (element.hasAttribute("data-processed")) {
              Array.from(element.children).forEach((child) => {
                const span = child as HTMLSpanElement;
                gsap.set(span, {
                  opacity: 0,
                  y: 15,
                  rotationY: 90,
                  transformOrigin: "50% 50%",
                });
              });
              return;
            }
            const originalText = element.textContent || "";
            const chars = originalText.split("");
            element.innerHTML = "";
            chars.forEach((char) => {
              const span = document.createElement("span");
              span.textContent = char;
              span.style.display = "inline-block";
              if (char === " ") span.style.width = "0.25em";
              element.appendChild(span);
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
          setupDesktopLineReveal();
        }
      };
      initDOM();

      const measure = () => {
        const containerRect = container.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        cache.containerWidth = containerRect.width;
        cache.wrapperOffset = wrapperRect.left - contentRect.left;
        cache.wrapperWidth = wrapperRect.width;

        if (enableParallax) {
          cache.parallax = [];
          wrapper.querySelectorAll("[data-parallax]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            const leftOffset = rect.left - wrapperRect.left;

            cache.parallax.push({
              el: element,
              speed: parseFloat(element.getAttribute("data-parallax") || "0.5"),
              initialX: (gsap.getProperty(element, "x") as number) || 0,
              leftOffset,
              width: rect.width,
              hasEntered: false,
              entryScrollX: 0,
              lastAppliedX: (gsap.getProperty(element, "x") as number) || 0,
            });
          });
        }

        if (enableFadeElements) {
          cache.fade = [];
          wrapper.querySelectorAll("[data-fade]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.fade.push({
              el: element,
              leftOffset: rect.left - wrapperRect.left,
              width: rect.width,
              lastOpacity: Number.NaN,
            });
          });

          cache.wordFade = [];
          wrapper.querySelectorAll("[data-fade-word]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.wordFade.push({
              el: element,
              leftOffset: rect.left - wrapperRect.left,
              width: rect.width,
              spans: Array.from(element.children) as HTMLSpanElement[],
              isFullyRevealed: false,
              lastPhase: "before",
              lastVisibleCount: 0,
            });
          });

          cache.charFade = [];
          wrapper.querySelectorAll("[data-fade-char]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.charFade.push({
              el: element,
              leftOffset: rect.left - wrapperRect.left,
              width: rect.width,
              spans: Array.from(element.children) as HTMLSpanElement[],
              isFullyRevealed: false,
              lastPhase: "before",
              lastVisibleCount: 0,
            });
          });
        }

        if (enableLineReveal) {
          cache.lineReveal = [];
          wrapper.querySelectorAll("[data-line-reveal]").forEach((element) => {
            const rect = element.getBoundingClientRect();
            cache.lineReveal.push({
              el: element,
              leftOffset: rect.left - wrapperRect.left,
              width: rect.width,
              lines: Array.from(element.children) as HTMLElement[],
              isFullyRevealed: false,
              lastPhase: "before",
              lastVisibleCount: 0,
            });
          });
        }
      };

      measure();

      const revealWordSpan = (span: HTMLSpanElement, delay = 0) => {
        gsap.to(span, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          delay,
          ease: "back.out(1.2)",
          overwrite: true,
        });
      };

      const hideWordSpan = (span: HTMLSpanElement) => {
        const isSpace = SPACE_REGEX.test(span.textContent || "");
        gsap.to(span, {
          opacity: 0,
          y: isSpace ? 0 : 10,
          scale: isSpace ? 1 : 0.8,
          duration: 0.2,
          ease: "power2.out",
          overwrite: true,
        });
      };

      const applyWordDelta = (
        spans: HTMLSpanElement[],
        from: number,
        to: number,
      ) => {
        if (to > from) {
          for (let i = from; i < to; i += 1) {
            const span = spans[i];
            if (!span) continue;
            revealWordSpan(span);
          }
          return;
        }
        for (let i = to; i < from; i += 1) {
          const span = spans[i];
          if (!span) continue;
          hideWordSpan(span);
        }
      };

      const revealCharSpan = (span: HTMLSpanElement, delay = 0) => {
        gsap.to(span, {
          opacity: 1,
          y: 0,
          rotationY: 0,
          duration: 0.3,
          delay,
          ease: "back.out(1.1)",
          overwrite: true,
        });
      };

      const hideCharSpan = (span: HTMLSpanElement) => {
        gsap.to(span, {
          opacity: 0,
          y: 15,
          rotationY: 90,
          duration: 0.15,
          ease: "power2.out",
          overwrite: true,
        });
      };

      const applyCharDelta = (
        spans: HTMLSpanElement[],
        from: number,
        to: number,
      ) => {
        if (to > from) {
          for (let i = from; i < to; i += 1) {
            const span = spans[i];
            if (!span) continue;
            revealCharSpan(span);
          }
          return;
        }
        for (let i = to; i < from; i += 1) {
          const span = spans[i];
          if (!span) continue;
          hideCharSpan(span);
        }
      };

      const revealLine = (line: HTMLElement, delay = 0) => {
        gsap.to(line, {
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration: 0.6,
          delay,
          ease: "back.out(1.7)",
          overwrite: true,
        });
      };

      const hideLine = (line: HTMLElement) => {
        gsap.to(line, {
          opacity: 0,
          y: 20,
          rotationX: -90,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        });
      };

      const applyLineDelta = (
        lines: HTMLElement[],
        from: number,
        to: number,
      ) => {
        if (to > from) {
          for (let i = from; i < to; i += 1) {
            const line = lines[i];
            if (!line) continue;
            revealLine(line);
          }
          return;
        }
        for (let i = to; i < from; i += 1) {
          const line = lines[i];
          if (!line) continue;
          hideLine(line);
        }
      };

      let lastX = -999999;

      const updateLoop = (
        currentX: number,
        forceUpdateWhenOffscreen = false,
      ) => {
        if (Math.abs(currentX - lastX) < 0.01) {
          return;
        }
        lastX = currentX;

        const wrapperLeft = currentX + cache.wrapperOffset;
        const wrapperRight = wrapperLeft + cache.wrapperWidth;
        const isVisible =
          wrapperLeft < cache.containerWidth && wrapperRight > 0;
        if (!isVisible && !forceUpdateWhenOffscreen) return;

        const { containerWidth } = cache;
        const baseX = currentX + cache.wrapperOffset;

        if (enableParallax) {
          const viewportPreparationZone = containerWidth;
          cache.parallax.forEach((item) => {
            const currentLeft = baseX + item.leftOffset;
            const projectedParallaxX = item.hasEntered
              ? item.initialX + (currentX - item.entryScrollX) * item.speed
              : item.lastAppliedX;
            const currentVisualLeft = currentLeft + projectedParallaxX;
            const currentVisualRight = currentVisualLeft + item.width;

            const isInViewportArea =
              currentVisualLeft < viewportPreparationZone &&
              currentVisualRight > 0;

            if (isInViewportArea) {
              let parallaxX = projectedParallaxX;
              if (!item.hasEntered) {
                item.hasEntered = true;
                item.entryScrollX = currentX;
                item.initialX = (gsap.getProperty(item.el, "x") as number) || 0;
                parallaxX = item.initialX;
              }

              if (Math.abs(parallaxX - item.lastAppliedX) > EPSILON) {
                gsap.set(item.el, { x: parallaxX });
                item.lastAppliedX = parallaxX;
              }
            } else if (currentVisualLeft >= viewportPreparationZone) {
              if (item.hasEntered) {
                item.hasEntered = false;
                item.entryScrollX = 0;
              }
            }
          });
        }

        if (enableFadeElements) {
          const animationStartX = containerWidth;
          const animationEndX = containerWidth * 0.8;
          const totalDistance = animationStartX - animationEndX;

          cache.fade.forEach((item) => {
            const currentLeft = baseX + item.leftOffset;
            const center = currentLeft + item.width / 2;
            let progress = 0;

            if (center <= animationEndX) progress = 1;
            else if (center >= animationStartX) progress = 0;
            else progress = (animationStartX - center) / totalDistance;

            const nextOpacity = Math.max(0, Math.min(1, progress));
            if (
              Number.isNaN(item.lastOpacity) ||
              Math.abs(nextOpacity - item.lastOpacity) > 0.01
            ) {
              gsap.set(item.el, { opacity: nextOpacity });
              item.lastOpacity = nextOpacity;
            }
          });

          const wordTriggerPoint = containerWidth * 0.8;
          cache.wordFade.forEach((item) => {
            const currentLeft = baseX + item.leftOffset;
            const currentRight = currentLeft + item.width;
            const maxCount = item.spans.length;
            const nextPhase: RevealPhase =
              currentRight <= wordTriggerPoint
                ? "after"
                : currentLeft <= containerWidth
                  ? "partial"
                  : "before";

            if (nextPhase === "after") {
              if (item.lastPhase !== "after") {
                item.isFullyRevealed = true;
                item.lastPhase = "after";
                item.lastVisibleCount = maxCount;
                item.spans.forEach((span, i) => {
                  revealWordSpan(span, i * 0.05);
                });
              }
              return;
            }

            item.isFullyRevealed = false;
            if (nextPhase === "before") {
              if (item.lastPhase !== "before") {
                if (item.lastPhase === "partial") {
                  applyWordDelta(item.spans, item.lastVisibleCount, 0);
                } else if (item.lastPhase === "after") {
                  item.spans.forEach((span) => hideWordSpan(span));
                }
                item.lastPhase = "before";
                item.lastVisibleCount = 0;
              }
              return;
            }

            const visibleProgress = Math.max(
              0,
              Math.min(1, (containerWidth - currentLeft) / item.width),
            );
            const nextCount = Math.floor(visibleProgress * maxCount);
            const prevCount =
              item.lastPhase === "partial"
                ? item.lastVisibleCount
                : item.lastPhase === "after"
                  ? maxCount
                  : 0;

            if (prevCount !== nextCount || item.lastPhase !== "partial") {
              applyWordDelta(item.spans, prevCount, nextCount);
              item.lastVisibleCount = nextCount;
              item.lastPhase = "partial";
            }
          });

          const charTriggerPoint = containerWidth * 0.75;
          cache.charFade.forEach((item) => {
            const currentLeft = baseX + item.leftOffset;
            const currentRight = currentLeft + item.width;
            const maxCount = item.spans.length;
            const nextPhase: RevealPhase =
              currentRight <= charTriggerPoint
                ? "after"
                : currentLeft <= containerWidth
                  ? "partial"
                  : "before";

            if (nextPhase === "after") {
              if (item.lastPhase !== "after") {
                item.isFullyRevealed = true;
                item.lastPhase = "after";
                item.lastVisibleCount = maxCount;
                item.spans.forEach((span, i) => {
                  revealCharSpan(span, i * 0.02);
                });
              }
              return;
            }

            item.isFullyRevealed = false;
            if (nextPhase === "before") {
              if (item.lastPhase !== "before") {
                if (item.lastPhase === "partial") {
                  applyCharDelta(item.spans, item.lastVisibleCount, 0);
                } else if (item.lastPhase === "after") {
                  item.spans.forEach((span) => hideCharSpan(span));
                }
                item.lastPhase = "before";
                item.lastVisibleCount = 0;
              }
              return;
            }

            const visibleProgress = Math.max(
              0,
              Math.min(1, (containerWidth - currentLeft) / item.width),
            );
            const nextCount = Math.floor(visibleProgress * maxCount);
            const prevCount =
              item.lastPhase === "partial"
                ? item.lastVisibleCount
                : item.lastPhase === "after"
                  ? maxCount
                  : 0;

            if (prevCount !== nextCount || item.lastPhase !== "partial") {
              applyCharDelta(item.spans, prevCount, nextCount);
              item.lastVisibleCount = nextCount;
              item.lastPhase = "partial";
            }
          });
        }

        if (enableLineReveal) {
          const lineTriggerPoint = containerWidth * 0.8;
          cache.lineReveal.forEach((item) => {
            const currentLeft = baseX + item.leftOffset;
            const currentRight = currentLeft + item.width;
            const maxCount = item.lines.length;
            const nextPhase: RevealPhase =
              currentRight <= lineTriggerPoint
                ? "after"
                : currentLeft <= containerWidth
                  ? "partial"
                  : "before";

            if (nextPhase === "after") {
              if (item.lastPhase !== "after") {
                item.isFullyRevealed = true;
                item.lastPhase = "after";
                item.lastVisibleCount = maxCount;
                item.lines.forEach((line, i) => {
                  revealLine(line, i * 0.1);
                });
              }
              return;
            }

            item.isFullyRevealed = false;
            if (nextPhase === "before") {
              if (item.lastPhase !== "before") {
                if (item.lastPhase === "partial") {
                  applyLineDelta(item.lines, item.lastVisibleCount, 0);
                } else if (item.lastPhase === "after") {
                  item.lines.forEach((line) => hideLine(line));
                }
                item.lastPhase = "before";
                item.lastVisibleCount = 0;
              }
              return;
            }

            const visibleProgress = Math.max(
              0,
              Math.min(1, (containerWidth - currentLeft) / item.width),
            );
            const nextCount = Math.floor(visibleProgress * maxCount);
            const prevCount =
              item.lastPhase === "partial"
                ? item.lastVisibleCount
                : item.lastPhase === "after"
                  ? maxCount
                  : 0;

            if (prevCount !== nextCount || item.lastPhase !== "partial") {
              applyLineDelta(item.lines, prevCount, nextCount);
              item.lastVisibleCount = nextCount;
              item.lastPhase = "partial";
            }
          });
        }
      };

      desktopHandlerRef.current = (message) => {
        if (message.containerWidth > 0) {
          cache.containerWidth = message.containerWidth;
        }
        updateLoop(message.currentX);
      };

      const handleHorizontalScrollEvent: HorizontalScrollEventMap["horizontal-scroll-progress"] =
        (message) => {
          if (!isHorizontalScrollProgressMessage(message)) return;
          desktopHandlerRef.current(message);
        };

      const listenerId = Symbol("horizontal-scroll-animation-listener");
      let isSubscribed = false;

      const subscribe = () => {
        if (isSubscribed) return;
        horizontalScrollEventStore
          .getState()
          .on(
            "horizontal-scroll-progress",
            listenerId,
            handleHorizontalScrollEvent,
          );
        isSubscribed = true;
      };

      const unsubscribe = () => {
        if (!isSubscribed) return;
        horizontalScrollEventStore
          .getState()
          .off("horizontal-scroll-progress", listenerId);
        isSubscribed = false;
      };

      const syncSubscriptionByVisibility = () => {
        const containerRect = container.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const isVisible =
          wrapperRect.right > containerRect.left &&
          wrapperRect.left < containerRect.right &&
          wrapperRect.bottom > containerRect.top &&
          wrapperRect.top < containerRect.bottom;

        if (isVisible) subscribe();
        else unsubscribe();
      };

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;

          if (entry.isIntersecting) {
            subscribe();
            return;
          }

          unsubscribe();
        },
        {
          root: container,
          threshold: 0,
        },
      );

      observer.observe(wrapper);

      const initialCurrentX =
        ((gsap.getProperty(content, "x") as number) || 0) - content.scrollLeft;
      updateLoop(initialCurrentX, true);
      syncSubscriptionByVisibility();

      const handleResize = () => {
        if (enableLineReveal) {
          setupDesktopLineReveal(true);
        }
        measure();
        lastX = Number.NaN;
        const currentX =
          ((gsap.getProperty(content, "x") as number) || 0) -
          content.scrollLeft;
        updateLoop(currentX, true);
        syncSubscriptionByVisibility();
      };

      window.addEventListener("resize", handleResize);
      cleanupFunctions.push(() =>
        window.removeEventListener("resize", handleResize),
      );
      cleanupFunctions.push(() => {
        observer.unobserve(wrapper);
        observer.disconnect();
      });
      cleanupFunctions.push(unsubscribe);
    }, wrapper);

    return () => {
      desktopHandlerRef.current = () => {};
      ctx.revert();
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [
    enableParallax,
    enableFadeElements,
    enableLineReveal,
    isMobile,
    horizontalScrollEventStore,
  ]);

  useEffect(() => {
    if (!isMobile) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const cleanupFunctions: (() => void)[] = [];
    const initTimeout = setTimeout(() => {
      const ctx = gsap.context(() => {
        const cache = {
          fade: [] as {
            el: Element;
            topOffset: number;
            height: number;
            lastOpacity: number;
          }[],
          wordFade: [] as {
            el: Element;
            topOffset: number;
            height: number;
            spans: HTMLSpanElement[];
            lastPhase: RevealPhase;
            lastVisibleCount: number;
          }[],
          charFade: [] as {
            el: Element;
            topOffset: number;
            height: number;
            spans: HTMLSpanElement[];
            lastPhase: RevealPhase;
            lastVisibleCount: number;
          }[],
          lineReveal: [] as {
            el: Element;
            topOffset: number;
            height: number;
            lines: HTMLElement[];
            lastPhase: RevealPhase;
            lastVisibleCount: number;
          }[],
        };

        const setupMobileLineReveal = (forceAutoRebuild = false) => {
          wrapper.querySelectorAll("[data-line-reveal]").forEach((element) => {
            prepareLineRevealElement(element, forceAutoRebuild);
            Array.from(element.children).forEach((line) => {
              void gsap.set(line, { opacity: 0, y: 20, rotationX: -90 });
            });
            element.setAttribute("data-processed", "true");
          });
        };

        const initDOM = () => {
          if (enableFadeElements) {
            wrapper.querySelectorAll("[data-fade]").forEach((el) => {
              void gsap.set(el, {
                opacity: 0,
                force3D: true,
              });
            });

            wrapper.querySelectorAll("[data-fade-word]").forEach((element) => {
              if (element.hasAttribute("data-processed")) {
                Array.from(element.children).forEach((child) => {
                  const span = child as HTMLSpanElement;
                  const isSpace = SPACE_REGEX.test(span.textContent || "");
                  if (isSpace) {
                    gsap.set(span, { opacity: 0 });
                  } else {
                    gsap.set(span, { opacity: 0, y: 10, scale: 0.8 });
                  }
                });
                return;
              }
              const originalText = element.textContent || "";
              const words = splitTextForWordFade(originalText);
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

            wrapper.querySelectorAll("[data-fade-char]").forEach((element) => {
              if (element.hasAttribute("data-processed")) {
                Array.from(element.children).forEach((child) => {
                  const span = child as HTMLSpanElement;
                  gsap.set(span, { opacity: 0, y: 15, rotationY: 90 });
                });
                return;
              }
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

          if (enableLineReveal) {
            setupMobileLineReveal();
          }
        };
        initDOM();

        const measure = () => {
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

          if (enableFadeElements) {
            cache.fade = [];
            wrapper.querySelectorAll("[data-fade]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.fade.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
                lastOpacity: Number.NaN,
              });
            });

            cache.wordFade = [];
            wrapper.querySelectorAll("[data-fade-word]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.wordFade.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
                spans: Array.from(el.children) as HTMLSpanElement[],
                lastPhase: "before",
                lastVisibleCount: 0,
              });
            });

            cache.charFade = [];
            wrapper.querySelectorAll("[data-fade-char]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.charFade.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
                spans: Array.from(el.children) as HTMLSpanElement[],
                lastPhase: "before",
                lastVisibleCount: 0,
              });
            });
          }
          if (enableLineReveal) {
            cache.lineReveal = [];
            wrapper.querySelectorAll("[data-line-reveal]").forEach((el) => {
              const rect = el.getBoundingClientRect();
              cache.lineReveal.push({
                el,
                topOffset: rect.top + scrollTop,
                height: rect.height,
                lines: Array.from(el.children) as HTMLElement[],
                lastPhase: "before",
                lastVisibleCount: 0,
              });
            });
          }
        };
        measure();

        const getProgressForCenter = (
          center: number,
          animStart: number,
          animEnd: number,
          totalDist: number,
        ) => {
          if (center <= animEnd) return 1;
          if (center >= animStart) return 0;
          return (animStart - center) / totalDist;
        };

        const revealWordSpan = (span: HTMLSpanElement) => {
          const isSpace = SPACE_REGEX.test(span.textContent || "");
          if (isSpace) {
            gsap.to(span, {
              opacity: 1,
              duration: 0.3,
              ease: "power2.out",
              overwrite: true,
            });
            return;
          }
          gsap.to(span, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "back.out(1.2)",
            overwrite: true,
          });
        };

        const hideWordSpan = (span: HTMLSpanElement) => {
          const isSpace = SPACE_REGEX.test(span.textContent || "");
          if (isSpace) {
            gsap.to(span, {
              opacity: 0,
              duration: 0.2,
              overwrite: true,
            });
            return;
          }
          gsap.to(span, {
            opacity: 0,
            y: 10,
            scale: 0.8,
            duration: 0.2,
            overwrite: true,
          });
        };

        const applyWordDelta = (
          spans: HTMLSpanElement[],
          from: number,
          to: number,
        ) => {
          if (to > from) {
            for (let i = from; i < to; i += 1) {
              const span = spans[i];
              if (!span) continue;
              revealWordSpan(span);
            }
            return;
          }
          for (let i = to; i < from; i += 1) {
            const span = spans[i];
            if (!span) continue;
            hideWordSpan(span);
          }
        };

        const revealCharSpan = (span: HTMLSpanElement) => {
          gsap.to(span, {
            opacity: 1,
            y: 0,
            rotationY: 0,
            duration: 0.3,
            ease: "power2.out",
            overwrite: true,
          });
        };

        const hideCharSpan = (span: HTMLSpanElement) => {
          gsap.to(span, {
            opacity: 0,
            y: 15,
            rotationY: 90,
            duration: 0.3,
            overwrite: true,
          });
        };

        const applyCharDelta = (
          spans: HTMLSpanElement[],
          from: number,
          to: number,
        ) => {
          if (to > from) {
            for (let i = from; i < to; i += 1) {
              const span = spans[i];
              if (!span) continue;
              revealCharSpan(span);
            }
            return;
          }
          for (let i = to; i < from; i += 1) {
            const span = spans[i];
            if (!span) continue;
            hideCharSpan(span);
          }
        };

        const revealLine = (line: HTMLElement) => {
          gsap.to(line, {
            opacity: 1,
            y: 0,
            rotationX: 0,
            duration: 0.4,
            overwrite: true,
          });
        };

        const hideLine = (line: HTMLElement) => {
          gsap.to(line, {
            opacity: 0,
            y: 20,
            rotationX: -90,
            duration: 0.3,
            overwrite: true,
          });
        };

        const applyLineDelta = (
          lines: HTMLElement[],
          from: number,
          to: number,
        ) => {
          if (to > from) {
            for (let i = from; i < to; i += 1) {
              const line = lines[i];
              if (!line) continue;
              revealLine(line);
            }
            return;
          }
          for (let i = to; i < from; i += 1) {
            const line = lines[i];
            if (!line) continue;
            hideLine(line);
          }
        };

        const onScroll = () => {
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          const animStart = scrollTop + windowHeight;
          const animEnd = scrollTop + windowHeight * 0.9;
          const totalDist = animStart - animEnd;

          if (enableFadeElements) {
            cache.fade.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              const progress = getProgressForCenter(
                center,
                animStart,
                animEnd,
                totalDist,
              );
              const nextOpacity = Math.max(0, Math.min(1, progress));
              if (
                Number.isNaN(item.lastOpacity) ||
                Math.abs(nextOpacity - item.lastOpacity) > 0.01
              ) {
                gsap.to(item.el, {
                  opacity: nextOpacity,
                  duration: 0.3,
                  ease: "power2.out",
                  overwrite: true,
                });
                item.lastOpacity = nextOpacity;
              }
            });

            cache.wordFade.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              const maxCount = item.spans.length;
              const nextPhase: RevealPhase =
                center <= animEnd
                  ? "after"
                  : center >= animStart
                    ? "before"
                    : "partial";

              if (nextPhase === "after") {
                if (item.lastPhase !== "after") {
                  const prevCount =
                    item.lastPhase === "partial"
                      ? item.lastVisibleCount
                      : item.lastPhase === "before"
                        ? 0
                        : maxCount;
                  applyWordDelta(item.spans, prevCount, maxCount);
                  item.lastPhase = "after";
                  item.lastVisibleCount = maxCount;
                }
                return;
              }

              if (nextPhase === "before") {
                if (item.lastPhase !== "before") {
                  const prevCount =
                    item.lastPhase === "partial"
                      ? item.lastVisibleCount
                      : item.lastPhase === "after"
                        ? maxCount
                        : 0;
                  applyWordDelta(item.spans, prevCount, 0);
                  item.lastPhase = "before";
                  item.lastVisibleCount = 0;
                }
                return;
              }

              const progress = getProgressForCenter(
                center,
                animStart,
                animEnd,
                totalDist,
              );
              const nextCount = Math.floor(progress * maxCount);
              const prevCount =
                item.lastPhase === "partial"
                  ? item.lastVisibleCount
                  : item.lastPhase === "after"
                    ? maxCount
                    : 0;

              if (prevCount !== nextCount || item.lastPhase !== "partial") {
                applyWordDelta(item.spans, prevCount, nextCount);
                item.lastPhase = "partial";
                item.lastVisibleCount = nextCount;
              }
            });

            cache.charFade.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              const maxCount = item.spans.length;
              const nextPhase: RevealPhase =
                center <= animEnd
                  ? "after"
                  : center >= animStart
                    ? "before"
                    : "partial";

              if (nextPhase === "after") {
                if (item.lastPhase !== "after") {
                  const prevCount =
                    item.lastPhase === "partial"
                      ? item.lastVisibleCount
                      : item.lastPhase === "before"
                        ? 0
                        : maxCount;
                  applyCharDelta(item.spans, prevCount, maxCount);
                  item.lastPhase = "after";
                  item.lastVisibleCount = maxCount;
                }
                return;
              }

              if (nextPhase === "before") {
                if (item.lastPhase !== "before") {
                  const prevCount =
                    item.lastPhase === "partial"
                      ? item.lastVisibleCount
                      : item.lastPhase === "after"
                        ? maxCount
                        : 0;
                  applyCharDelta(item.spans, prevCount, 0);
                  item.lastPhase = "before";
                  item.lastVisibleCount = 0;
                }
                return;
              }

              const progress = getProgressForCenter(
                center,
                animStart,
                animEnd,
                totalDist,
              );
              const nextCount = Math.floor(progress * maxCount);
              const prevCount =
                item.lastPhase === "partial"
                  ? item.lastVisibleCount
                  : item.lastPhase === "after"
                    ? maxCount
                    : 0;

              if (prevCount !== nextCount || item.lastPhase !== "partial") {
                applyCharDelta(item.spans, prevCount, nextCount);
                item.lastPhase = "partial";
                item.lastVisibleCount = nextCount;
              }
            });
          }

          if (enableLineReveal) {
            cache.lineReveal.forEach((item) => {
              const center = item.topOffset + item.height / 2;
              const maxCount = item.lines.length;
              const nextPhase: RevealPhase =
                center <= animEnd
                  ? "after"
                  : center >= animStart
                    ? "before"
                    : "partial";

              if (nextPhase === "after") {
                if (item.lastPhase !== "after") {
                  const prevCount =
                    item.lastPhase === "partial"
                      ? item.lastVisibleCount
                      : item.lastPhase === "before"
                        ? 0
                        : maxCount;
                  applyLineDelta(item.lines, prevCount, maxCount);
                  item.lastPhase = "after";
                  item.lastVisibleCount = maxCount;
                }
                return;
              }

              if (nextPhase === "before") {
                if (item.lastPhase !== "before") {
                  const prevCount =
                    item.lastPhase === "partial"
                      ? item.lastVisibleCount
                      : item.lastPhase === "after"
                        ? maxCount
                        : 0;
                  applyLineDelta(item.lines, prevCount, 0);
                  item.lastPhase = "before";
                  item.lastVisibleCount = 0;
                }
                return;
              }

              const progress = getProgressForCenter(
                center,
                animStart,
                animEnd,
                totalDist,
              );
              const nextCount = Math.floor(progress * maxCount);
              const prevCount =
                item.lastPhase === "partial"
                  ? item.lastVisibleCount
                  : item.lastPhase === "after"
                    ? maxCount
                    : 0;

              if (prevCount !== nextCount || item.lastPhase !== "partial") {
                applyLineDelta(item.lines, prevCount, nextCount);
                item.lastPhase = "partial";
                item.lastVisibleCount = nextCount;
              }
            });
          }
        };

        let rafId: number | null = null;
        const scheduleOnScroll = () => {
          if (rafId !== null) return;
          rafId = window.requestAnimationFrame(() => {
            rafId = null;
            onScroll();
          });
        };

        let isScrollSubscribed = false;
        const subscribeScroll = () => {
          if (isScrollSubscribed) return;
          window.addEventListener("scroll", scheduleOnScroll, {
            passive: true,
          });
          isScrollSubscribed = true;
        };

        const unsubscribeScroll = () => {
          if (!isScrollSubscribed) return;
          window.removeEventListener("scroll", scheduleOnScroll);
          isScrollSubscribed = false;
          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
          }
        };

        const syncSubscriptionByVisibility = () => {
          const wrapperRect = wrapper.getBoundingClientRect();
          const isVisible =
            wrapperRect.bottom > 0 && wrapperRect.top < window.innerHeight;

          if (isVisible) {
            subscribeScroll();
            scheduleOnScroll();
            return;
          }
          unsubscribeScroll();
        };

        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            if (entry.isIntersecting) {
              subscribeScroll();
              scheduleOnScroll();
              return;
            }
            unsubscribeScroll();
          },
          {
            root: null,
            threshold: 0,
          },
        );

        observer.observe(wrapper);

        const handleResize = () => {
          if (enableLineReveal) {
            setupMobileLineReveal(true);
          }
          measure();
          syncSubscriptionByVisibility();
          scheduleOnScroll();
        };

        window.addEventListener("resize", handleResize);
        cleanupFunctions.push(() => {
          window.removeEventListener("resize", handleResize);
        });
        cleanupFunctions.push(() => {
          observer.unobserve(wrapper);
          observer.disconnect();
        });
        cleanupFunctions.push(unsubscribeScroll);

        onScroll();
        syncSubscriptionByVisibility();
      }, wrapper);
      cleanupFunctions.push(() => ctx.revert());
    }, 500);

    cleanupFunctions.push(() => clearTimeout(initTimeout));
    return () => cleanupFunctions.forEach((c) => c());
  }, [isMobile, enableFadeElements, enableLineReveal]);

  return (
    <div ref={wrapperRef} className={className}>
      {children}
    </div>
  );
}
