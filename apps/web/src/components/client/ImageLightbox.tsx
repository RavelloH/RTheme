"use client";

import { useEffect, useCallback } from "react";
import { useBroadcast } from "@/hooks/use-broadcast";
import type { MDXContentMessage } from "@/types/broadcast-messages";

/**
 * 图片灯箱组件
 * 为带有 data-lightbox 属性的图片添加点击放大功能
 *
 * 功能特性：
 * - 点击图片放大到屏幕中心
 * - 平滑的缩放和位移动画
 * - 点击遮罩或图片关闭灯箱
 * - ESC 键关闭
 * - 自动适配屏幕尺寸（最大90%视口）
 * - 保持原图宽高比
 */
export default function ImageLightbox() {
  const handleImageClick = useCallback((img: HTMLImageElement) => {
    // 防止重复打开
    if (document.querySelector(".image-lightbox-overlay")) {
      return;
    }

    const rect = img.getBoundingClientRect();

    // 创建遮罩层（参考 Dialog 组件样式）
    const overlay = document.createElement("div");
    overlay.className = "image-lightbox-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 999;
      cursor: zoom-out;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // 创建占位元素（保持布局稳定）
    const placeholder = document.createElement("div");
    const computedStyle = window.getComputedStyle(img);
    placeholder.className = "image-lightbox-placeholder";
    const placeholderDisplay =
      computedStyle.display === "inline"
        ? "inline-block"
        : computedStyle.display;
    placeholder.style.cssText = `
      display: ${placeholderDisplay};
      width: ${rect.width}px;
      height: ${rect.height}px;
      margin: ${computedStyle.margin};
      vertical-align: ${computedStyle.verticalAlign};
    `;

    // 克隆图片元素
    const clone = img.cloneNode(true) as HTMLImageElement;
    clone.className = "image-lightbox-clone";
    clone.style.cssText = `
      position: fixed;
      z-index: 1000;
      cursor: zoom-out;
      max-width: none;
      max-height: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      object-fit: contain;
      transform-origin: top left;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      transform: none;
      opacity: 1;
    `;

    // 添加到 DOM
    document.body.appendChild(overlay);
    document.body.appendChild(clone);
    img.parentNode?.insertBefore(placeholder, img);
    img.style.display = "none";

    // 禁止页面滚动
    document.body.style.overflow = "hidden";

    // 触发重排，确保初始状态生效
    void clone.offsetHeight;

    // 开始放大动画
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";

      // 计算放大后的尺寸（最大为视口的90%）
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;
      const scale = Math.min(maxWidth / rect.width, maxHeight / rect.height, 2);

      const scaledWidth = rect.width * scale;
      const scaledHeight = rect.height * scale;

      // 计算居中位置
      const translateX = (window.innerWidth - scaledWidth) / 2 - rect.left;
      const translateY = (window.innerHeight - scaledHeight) / 2 - rect.top;

      clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    });

    // 关闭灯箱函数
    const closeLightbox = () => {
      clone.style.transform = "none";
      overlay.style.opacity = "0";

      setTimeout(() => {
        // 恢复原图显示
        img.style.display = "";

        // 清理元素
        placeholder.remove();
        clone.remove();
        overlay.remove();

        // 恢复页面滚动
        document.body.style.overflow = "";
      }, 300);
    };

    // 绑定关闭事件
    clone.onclick = closeLightbox;
    overlay.onclick = closeLightbox;

    // ESC 键关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
  }, []);

  // 绑定图片点击事件
  const attachLightboxToImages = useCallback(() => {
    // 查找所有可放大的图片
    const images =
      document.querySelectorAll<HTMLImageElement>("img[data-lightbox]");
    const cleanups: Array<() => void> = [];

    // 添加样式和事件监听
    images.forEach((img) => {
      img.style.cursor = "zoom-in";
      img.style.transition = "opacity 0.2s ease";

      // 悬停效果
      const handleMouseEnter = () => {
        img.style.opacity = "0.8";
      };
      const handleMouseLeave = () => {
        img.style.opacity = "1";
      };

      img.addEventListener("mouseenter", handleMouseEnter);
      img.addEventListener("mouseleave", handleMouseLeave);

      const clickHandler = () => handleImageClick(img);
      img.addEventListener("click", clickHandler);

      cleanups.push(() => {
        img.removeEventListener("mouseenter", handleMouseEnter);
        img.removeEventListener("mouseleave", handleMouseLeave);
        img.removeEventListener("click", clickHandler);
      });
    });

    // 清理所有事件监听器
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      images.forEach((img) => {
        img.style.cursor = "";
        img.style.transition = "";
      });
    };
  }, [handleImageClick]);

  // 初始绑定
  useEffect(() => {
    return attachLightboxToImages();
  }, [attachLightboxToImages]);

  // 监听 MDX 渲染完成广播，重新绑定图片
  useBroadcast<MDXContentMessage>((message) => {
    if (
      message.type === "mdx-content-rendered" ||
      message.type === "mdx-content-recheck"
    ) {
      // 稍微延迟一下确保 DOM 完全更新
      setTimeout(() => {
        attachLightboxToImages();
      }, 150);
    }
  });

  return null;
}
