"use client";

import { ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";

interface GSAPHorizontalScrollProps {
  children: ReactNode;
  className?: string;
  scrollSpeed?: number;
  enableParallax?: boolean;
  enableFadeElements?: boolean;
  enableLineReveal?: boolean;
  snapToElements?: boolean;
}

export default function HorizontalScroll({
  children,
  className = "",
  scrollSpeed = 1,
  enableParallax = false,
  enableFadeElements = false,
  enableLineReveal = false,
}: GSAPHorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const targetXRef = useRef(0);
  const animationRef = useRef<gsap.core.Tween | null>(null);

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
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) return;

    // 初始化位置
    const initialX = (gsap.getProperty(content, "x") as number) || 0;
    targetXRef.current = initialX;

    // 存储清理函数
    const cleanupFunctions: (() => void)[] = [];

    // 创建 GSAP 上下文
    const ctx = gsap.context(() => {
      // 更新到目标位置的函数
      const animateToTarget = () => {
        // 停止当前动画
        if (animationRef.current) {
          animationRef.current.kill();
        }

        // 获取当前位置
        const currentX = gsap.getProperty(content, "x") as number;
        const targetX = targetXRef.current;

        // 如果已经在目标位置，不需要动画
        if (Math.abs(targetX - currentX) < 0.1) {
          return;
        }

        // 创建新的GSAP动画，使用惯性ease
        animationRef.current = gsap.to(content, {
          x: targetX,
          duration: 1,
          ease: "power3.out", // 这个ease模拟真实的惯性感觉
          overwrite: false,
        });
      };

      // 鼠标滚轮控制
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        // 计算滚动增量
        const deltaX = e.deltaY * scrollSpeed;

        // 更新目标位置
        const newTargetX = targetXRef.current - deltaX;

        // 计算边界
        const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
        targetXRef.current = Math.max(maxScrollLeft, Math.min(0, newTargetX));

        // 触发动画到新的目标位置
        animateToTarget();
      };

      // 触摸开始处理
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 0) return;

        const touch = e.touches[0];
        if (!touch) return;

        const now = Date.now();

        touchStateRef.current = {
          isStarted: true,
          startX: touch.clientX,
          startY: touch.clientY,
          startTargetX: targetXRef.current,
          currentX: touch.clientX,
          velocity: 0,
          lastTime: now,
          direction: 0,
          isDragging: false,
        };

        // 停止当前动画
        if (animationRef.current) {
          animationRef.current.kill();
        }
      };

      // 触摸移动处理
      const handleTouchMove = (e: TouchEvent) => {
        if (!touchStateRef.current.isStarted || e.touches.length === 0) return;

        const touch = e.touches[0];
        if (!touch) return;

        const now = Date.now();
        const deltaTime = now - touchStateRef.current.lastTime;

        // 节流：至少间隔 16ms（60fps）
        if (deltaTime < 16) return;

        const deltaX = touch.clientX - touchStateRef.current.currentX;
        const deltaY = touch.clientY - touchStateRef.current.startY;

        // 判断是否为水平拖动
        const horizontalDistance = Math.abs(
          touch.clientX - touchStateRef.current.startX,
        );
        const verticalDistance = Math.abs(deltaY);

        if (horizontalDistance > 10 && horizontalDistance > verticalDistance) {
          e.preventDefault();
          touchStateRef.current.isDragging = true;

          // 计算速度
          touchStateRef.current.velocity = deltaX / deltaTime;
          touchStateRef.current.direction = deltaX > 0 ? 1 : -1;

          // 更新目标位置
          const newTargetX =
            touchStateRef.current.startTargetX +
            (touch.clientX - touchStateRef.current.startX);

          // 计算边界
          const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
          targetXRef.current = Math.max(maxScrollLeft, Math.min(0, newTargetX));

          // 立即更新位置（跟随手指）
          gsap.set(content, { x: targetXRef.current });

          touchStateRef.current.currentX = touch.clientX;
          touchStateRef.current.lastTime = now;
        }
      };

      // 触摸结束处理
      const handleTouchEnd = () => {
        if (!touchStateRef.current.isStarted) return;

        touchStateRef.current.isStarted = false;

        if (touchStateRef.current.isDragging) {
          // 计算惯性滚动
          const velocity = touchStateRef.current.velocity;
          const momentum = velocity * 300; // 惯性系数

          // 计算最终位置
          let finalX = targetXRef.current + momentum;

          // 边界检查
          const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
          finalX = Math.max(maxScrollLeft, Math.min(0, finalX));

          // 更新目标位置
          targetXRef.current = finalX;

          // 使用动画到达最终位置
          animateToTarget();
        }

        touchStateRef.current.isDragging = false;
      };

      // 如果启用视差效果
      if (enableParallax) {
        const parallaxElements = content.querySelectorAll("[data-parallax]");

        // 为每个视差元素存储其初始状态
        const elementStates = new Map();

        parallaxElements.forEach((element) => {
          const speed = parseFloat(
            element.getAttribute("data-parallax") || "0.5",
          );

          // 设置初始样式
          gsap.set(element, { transformOrigin: "center center" });

          // 初始化元素状态
          elementStates.set(element, {
            speed,
            initialX: 0,
            hasEnteredViewport: false,
            viewportEntryX: 0,
          });
        });

        // 创建视差更新函数
        const updateParallaxElements = () => {
          const containerRect = container.getBoundingClientRect();
          const containerWidth = containerRect.width;

          parallaxElements.forEach((element) => {
            const elementRect = element.getBoundingClientRect();
            const elementState = elementStates.get(element);

            // 计算元素相对于容器的位置
            const elementLeftInContainer =
              elementRect.left - containerRect.left;
            const elementRightInContainer =
              elementLeftInContainer + elementRect.width;

            // 定义视口范围：从右边界向左扩展100px作为"准备区域"
            const viewportPreparationZone = containerWidth + 100; // 右边界外100px开始准备

            // 检查元素是否在视口范围内（包括准备区域）
            const isInViewportArea =
              elementLeftInContainer < viewportPreparationZone &&
              elementRightInContainer > 0;

            if (isInViewportArea) {
              // 如果元素首次进入视口区域，记录当前的滚动位置作为基准点
              if (!elementState.hasEnteredViewport) {
                elementState.hasEnteredViewport = true;
                elementState.viewportEntryX = gsap.getProperty(
                  content,
                  "x",
                ) as number;
                elementState.initialX =
                  (gsap.getProperty(element, "x") as number) || 0;
              }

              // 计算从进入视口开始的相对移动距离
              const currentContentX = gsap.getProperty(content, "x") as number;
              const relativeMovement =
                currentContentX - elementState.viewportEntryX;

              // 应用视差效果：基于相对移动距离
              const parallaxX =
                elementState.initialX + relativeMovement * elementState.speed;
              gsap.set(element, { x: parallaxX });
            } else if (elementLeftInContainer >= viewportPreparationZone) {
              // 元素还未进入准备区域，重置状态
              if (elementState.hasEnteredViewport) {
                elementState.hasEnteredViewport = false;
                elementState.viewportEntryX = 0;
                // 保持当前位置，不重置到初始位置
              }
            }
            // 如果元素已经完全离开左侧视口，保持最后的视差位置
          });
        };

        // 使用 GSAP ticker 来更新视差效果
        gsap.ticker.add(updateParallaxElements);

        // 添加清理函数
        cleanupFunctions.push(() => gsap.ticker.remove(updateParallaxElements));
      }

      // 如果启用淡入效果
      if (enableFadeElements) {
        const fadeElements = content.querySelectorAll("[data-fade]");

        // 创建一个函数来更新所有淡入元素的状态
        const updateFadeElements = () => {
          const containerRect = container.getBoundingClientRect();
          const containerWidth = containerRect.width;

          fadeElements.forEach((element) => {
            // 获取元素在文档中的位置
            const elementRect = element.getBoundingClientRect();

            // 计算元素相对于容器视口的位置
            // elementRect.left 是相对于整个页面的，containerRect.left 也是
            // 所以 elementRect.left - containerRect.left 得到的是元素相对于容器的位置
            const elementLeftInContainer =
              elementRect.left - containerRect.left;
            const elementCenter =
              elementLeftInContainer + elementRect.width / 2;

            // 定义动画范围：从右边界到屏幕右侧80%位置
            const animationStartX = containerWidth; // 右边界
            const animationEndX = containerWidth * 0.8; // 屏幕右侧80%位置

            // 计算元素中心在动画范围内的进度
            let animationProgress = 0;

            if (elementCenter <= animationEndX) {
              // 元素已经到达或超过屏幕右侧80%位置，完全显示
              animationProgress = 1;
            } else if (elementCenter >= animationStartX) {
              // 元素还在右边界外，不显示
              animationProgress = 0;
            } else {
              // 元素在动画范围内，计算进度
              const totalDistance = animationStartX - animationEndX;
              const currentDistance = animationStartX - elementCenter;
              animationProgress = currentDistance / totalDistance;
            }

            // 确保进度在 0-1 范围内
            animationProgress = Math.max(0, Math.min(1, animationProgress));

            // 根据动画进度计算透明度和Y偏移
            const opacity = animationProgress;
            const yOffset = (1 - animationProgress) * 30; // 从30px偏移到0

            // 应用动画，使用较短的持续时间以保持响应性
            gsap.to(element, {
              opacity,
              y: yOffset,
              duration: 0.1,
              ease: "none",
              overwrite: true,
            });
          });
        };

        // 初始状态设置
        fadeElements.forEach((element) => {
          gsap.set(element, { opacity: 0, y: 30 });
        });

        // 立即更新一次
        updateFadeElements();

        // 使用 GSAP ticker 来持续更新淡入效果
        gsap.ticker.add(updateFadeElements);

        // 添加清理函数
        cleanupFunctions.push(() => gsap.ticker.remove(updateFadeElements));

        // 逐字淡入效果
        const wordFadeElements = content.querySelectorAll("[data-fade-word]");

        wordFadeElements.forEach((element) => {
          // 将文本内容分割成单词并包装在span中
          const originalText = element.textContent || "";
          const words = originalText
            .split(/(\s+)/)
            .filter((word) => word.length > 0);

          // 清空原内容并重新构建
          element.innerHTML = "";

          const wordSpans: HTMLSpanElement[] = [];
          words.forEach((word) => {
            const span = document.createElement("span");
            span.textContent = word;
            span.style.display = "inline-block";

            // 为空格设置固定宽度，避免缩放影响
            if (/^\s+$/.test(word)) {
              span.style.width = word.length * 0.25 + "em";
              span.style.minWidth = word.length * 0.25 + "em";
            }

            element.appendChild(span);

            // 为所有单词（包括空格）应用动画
            wordSpans.push(span);
          });

          // 初始状态：隐藏所有单词
          wordSpans.forEach((span) => {
            const isSpace = /^\s+$/.test(span.textContent || "");

            if (isSpace) {
              // 空格只控制透明度，不缩放
              gsap.set(span, {
                opacity: 0,
                transformOrigin: "50% 100%",
              });
            } else {
              // 非空格单词进行完整动画
              gsap.set(span, {
                opacity: 0,
                y: 10,
                scale: 0.8,
                transformOrigin: "50% 100%",
              });
            }
          });

          // 创建一个函数来更新逐字淡入状态
          const updateWordFade = () => {
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const elementRect = element.getBoundingClientRect();

            // 计算元素相对于容器的位置
            const elementLeftInContainer =
              elementRect.left - containerRect.left;
            const elementRightInContainer =
              elementLeftInContainer + elementRect.width;

            // 定义触发范围：当元素进入屏幕右侧80%位置时开始逐字显示
            const triggerPoint = containerWidth * 0.8;

            // 检查元素是否进入触发范围
            if (elementRightInContainer <= triggerPoint) {
              // 元素已经完全进入视野，显示所有单词
              wordSpans.forEach((span, index) => {
                const isSpace = /^\s+$/.test(span.textContent || "");

                if (isSpace) {
                  // 空格只淡入，不缩放和移动
                  gsap.to(span, {
                    opacity: 1,
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: "back.out(1.2)",
                    overwrite: true,
                  });
                } else {
                  // 非空格单词进行完整动画
                  gsap.to(span, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    delay: index * 0.05, // 每个单词延迟0.05秒
                    ease: "back.out(1.2)",
                    overwrite: true,
                  });
                }
              });
            } else if (elementLeftInContainer <= containerWidth) {
              // 元素部分可见，计算应该显示多少单词
              const visibleProgress = Math.max(
                0,
                Math.min(
                  1,
                  (containerWidth - elementLeftInContainer) / elementRect.width,
                ),
              );

              // 根据可见进度决定显示多少单词
              const wordsToShow = Math.floor(
                visibleProgress * wordSpans.length,
              );

              wordSpans.forEach((span, index) => {
                const isSpace = /^\s+$/.test(span.textContent || "");

                if (index < wordsToShow) {
                  // 显示这个单词
                  if (isSpace) {
                    // 空格只淡入
                    gsap.to(span, {
                      opacity: 1,
                      duration: 0.4,
                      ease: "back.out(1.2)",
                      overwrite: true,
                    });
                  } else {
                    // 非空格单词进行完整动画
                    gsap.to(span, {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      duration: 0.4,
                      ease: "back.out(1.2)",
                      overwrite: true,
                    });
                  }
                } else {
                  // 隐藏这个单词
                  if (isSpace) {
                    // 空格只淡出
                    gsap.to(span, {
                      opacity: 0,
                      duration: 0.2,
                      ease: "power2.out",
                      overwrite: true,
                    });
                  } else {
                    // 非空格单词进行完整隐藏动画
                    gsap.to(span, {
                      opacity: 0,
                      y: 10,
                      scale: 0.8,
                      duration: 0.2,
                      ease: "power2.out",
                      overwrite: true,
                    });
                  }
                }
              });
            } else {
              // 元素完全不可见，隐藏所有单词
              wordSpans.forEach((span) => {
                const isSpace = /^\s+$/.test(span.textContent || "");

                if (isSpace) {
                  // 空格只淡出
                  gsap.to(span, {
                    opacity: 0,
                    duration: 0.2,
                    ease: "power2.out",
                    overwrite: true,
                  });
                } else {
                  // 非空格单词进行完整隐藏动画
                  gsap.to(span, {
                    opacity: 0,
                    y: 10,
                    scale: 0.8,
                    duration: 0.2,
                    ease: "power2.out",
                    overwrite: true,
                  });
                }
              });
            }
          };

          // 使用 GSAP ticker 来持续更新逐字淡入效果
          gsap.ticker.add(updateWordFade);

          // 添加清理函数
          cleanupFunctions.push(() => gsap.ticker.remove(updateWordFade));

          // 立即更新一次
          updateWordFade();
        });

        // 逐字符淡入效果
        const charFadeElements = content.querySelectorAll("[data-fade-char]");

        charFadeElements.forEach((element) => {
          // 将文本内容分割成字符并包装在span中
          const originalText = element.textContent || "";
          const chars = originalText.split("");

          // 清空原内容并重新构建
          element.innerHTML = "";

          const charSpans: HTMLSpanElement[] = [];
          chars.forEach((char) => {
            const span = document.createElement("span");
            span.textContent = char;
            span.style.display = "inline-block";

            // 为空格添加特殊处理，保持原有宽度
            if (char === " ") {
              span.style.width = "0.25em";
            }

            element.appendChild(span);
            charSpans.push(span);
          });

          // 初始状态：隐藏所有字符
          charSpans.forEach((span) => {
            gsap.set(span, {
              opacity: 0,
              y: 15,
              rotationY: 90,
              transformOrigin: "50% 50%",
            });
          });

          // 创建一个函数来更新逐字符淡入状态
          const updateCharFade = () => {
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const elementRect = element.getBoundingClientRect();

            // 计算元素相对于容器的位置
            const elementLeftInContainer =
              elementRect.left - containerRect.left;
            const elementRightInContainer =
              elementLeftInContainer + elementRect.width;

            // 定义触发范围：当元素进入屏幕右侧75%位置时开始逐字符显示
            const triggerPoint = containerWidth * 0.75;

            // 检查元素是否进入触发范围
            if (elementRightInContainer <= triggerPoint) {
              // 元素已经完全进入视野，显示所有字符
              charSpans.forEach((span, index) => {
                gsap.to(span, {
                  opacity: 1,
                  y: 0,
                  rotationY: 0,
                  duration: 0.3,
                  delay: index * 0.02, // 每个字符延迟0.02秒
                  ease: "back.out(1.1)",
                  overwrite: true,
                });
              });
            } else if (elementLeftInContainer <= containerWidth) {
              // 元素部分可见，计算应该显示多少字符
              const visibleProgress = Math.max(
                0,
                Math.min(
                  1,
                  (containerWidth - elementLeftInContainer) / elementRect.width,
                ),
              );

              // 根据可见进度决定显示多少字符
              const charsToShow = Math.floor(
                visibleProgress * charSpans.length,
              );

              charSpans.forEach((span, index) => {
                if (index < charsToShow) {
                  // 显示这个字符
                  gsap.to(span, {
                    opacity: 1,
                    y: 0,
                    rotationY: 0,
                    duration: 0.3,
                    ease: "back.out(1.1)",
                    overwrite: true,
                  });
                } else {
                  // 隐藏这个字符
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
              // 元素完全不可见，隐藏所有字符
              charSpans.forEach((span) => {
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
          };

          // 使用 GSAP ticker 来持续更新逐字符淡入效果
          gsap.ticker.add(updateCharFade);

          // 添加清理函数
          cleanupFunctions.push(() => gsap.ticker.remove(updateCharFade));

          // 立即更新一次
          updateCharFade();
        });
      }

      // 如果启用逐行显示效果
      if (enableLineReveal) {
        const lineRevealElements =
          content.querySelectorAll("[data-line-reveal]");

        lineRevealElements.forEach((element) => {
          // 获取所有直接子元素作为"行"
          const lines = Array.from(element.children) as HTMLElement[];

          // 初始状态：隐藏所有行
          lines.forEach((line) => {
            gsap.set(line, {
              opacity: 0,
              y: 20,
              rotationX: -90,
              transformOrigin: "50% 100%",
            });
          });

          // 创建一个函数来更新逐行显示状态
          const updateLineReveal = () => {
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const elementRect = element.getBoundingClientRect();

            // 计算元素相对于容器的位置
            const elementLeftInContainer =
              elementRect.left - containerRect.left;
            const elementRightInContainer =
              elementLeftInContainer + elementRect.width;

            // 定义触发范围：当元素进入屏幕右侧70%位置时开始逐行显示
            const triggerPoint = containerWidth * 0.8;

            // 检查元素是否进入触发范围
            if (elementRightInContainer <= triggerPoint) {
              // 元素已经完全进入视野，显示所有行
              lines.forEach((line, index) => {
                gsap.to(line, {
                  opacity: 1,
                  y: 0,
                  rotationX: 0,
                  duration: 0.6,
                  delay: index * 0.1, // 每行延迟0.1秒
                  ease: "back.out(1.7)",
                  overwrite: true,
                });
              });
            } else if (elementLeftInContainer <= containerWidth) {
              // 元素部分可见，计算应该显示多少行
              const visibleProgress = Math.max(
                0,
                Math.min(
                  1,
                  (containerWidth - elementLeftInContainer) / elementRect.width,
                ),
              );

              // 根据可见进度决定显示多少行
              const linesToShow = Math.floor(visibleProgress * lines.length);

              lines.forEach((line, index) => {
                if (index < linesToShow) {
                  // 显示这一行
                  gsap.to(line, {
                    opacity: 1,
                    y: 0,
                    rotationX: 0,
                    duration: 0.6,
                    ease: "back.out(1.7)",
                    overwrite: true,
                  });
                } else {
                  // 隐藏这一行
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
              // 元素完全不可见，隐藏所有行
              lines.forEach((line) => {
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
          };

          // 使用 GSAP ticker 来持续更新逐行显示效果
          gsap.ticker.add(updateLineReveal);

          // 添加清理函数
          cleanupFunctions.push(() => gsap.ticker.remove(updateLineReveal));

          // 立即更新一次
          updateLineReveal();
        });
      }

      // 添加鼠标滚轮监听
      container.addEventListener("wheel", handleWheel, { passive: false });

      // 添加触摸事件监听
      container.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      container.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      container.addEventListener("touchend", handleTouchEnd, {
        passive: false,
      });

      // 添加清理函数
      cleanupFunctions.push(() =>
        container.removeEventListener("wheel", handleWheel),
      );
      cleanupFunctions.push(() =>
        container.removeEventListener("touchstart", handleTouchStart),
      );
      cleanupFunctions.push(() =>
        container.removeEventListener("touchmove", handleTouchMove),
      );
      cleanupFunctions.push(() =>
        container.removeEventListener("touchend", handleTouchEnd),
      );
    }, container);

    // 组件卸载时清理
    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
      ctx.revert();
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [scrollSpeed, enableParallax, enableFadeElements, enableLineReveal]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden horizontal-scroll-container ${className}`}
    >
      <div
        ref={contentRef}
        className="flex h-full will-change-transform horizontal-scroll-content"
      >
        {children}
      </div>
    </div>
  );
}
