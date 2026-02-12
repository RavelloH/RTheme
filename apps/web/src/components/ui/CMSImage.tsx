"use client";

import { useState } from "react";
import { RiFileDamageFill } from "@remixicon/react";
import type { ImageProps } from "next/image";
import Image from "next/image";

interface CMSImageProps
  extends Omit<
    ImageProps,
    "src" | "placeholder" | "blurDataURL" | "width" | "height" | "fill"
  > {
  /** 图片地址 */
  src: string;
  /** 宽度（fill 模式下可选） */
  width?: number;
  /** 高度（fill 模式下可选） */
  height?: number;
  /** 是否填充父容器 */
  fill?: boolean;
  /** 是否优化（默认 true，外部图片会自动设置为 false） */
  optimized?: boolean;
  /** blur 占位图数据（需要是完整的 data URL 格式） */
  blur?: string | null;
}

/**
 * 检查是否是 CMS 内置图片
 * @param url 图片 URL
 * @returns 是否是 CMS 内置图片
 */
function isCMSImage(url: string): boolean {
  return typeof url === "string" && url.startsWith("/p/");
}

export default function CMSImage({
  src,
  width,
  height,
  fill,
  optimized,
  blur,
  alt,
  onError,
  className,
  priority,
  ...rest
}: CMSImageProps) {
  const [hasError, setHasError] = useState(false);

  // 判断是否是 CMS 内部图片
  const isInternalImage = isCMSImage(src);

  // 外部图片默认不优化，内部图片默认优化
  const shouldOptimize = optimized !== undefined ? optimized : isInternalImage;

  // 检查 blur 是否是有效的 data URL
  const isValidBlur = blur && blur.startsWith("data:");

  // 处理图片加载错误
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  // 如果加载失败，显示错误占位图标
  if (hasError) {
    return (
      <span
        className={`${fill ? "flex" : "inline-flex"} items-center justify-center bg-muted/30 text-muted-foreground max-w-full max-h-[50vh] ${className || ""}`}
        style={
          fill
            ? { position: "absolute", inset: 0 }
            : { width: width, height: height }
        }
      >
        <RiFileDamageFill size="4em" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      {...(fill ? { fill: true } : { width, height })}
      alt={alt}
      unoptimized={!shouldOptimize}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      placeholder={isValidBlur ? "blur" : "empty"}
      blurDataURL={isValidBlur ? blur : undefined}
      onError={handleError}
      className={className}
      {...rest}
    />
  );
}
