"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { RiFileDamageFill } from "@remixicon/react";

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
  return url.startsWith("/p/");
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
      <div
        className={`flex items-center justify-center bg-muted/30 text-muted-foreground ${className || ""}`}
        style={
          fill
            ? { position: "absolute", inset: 0 }
            : { width: width || "100%", height: height || "100%" }
        }
      >
        <RiFileDamageFill size="2em" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      {...(fill ? { fill: true } : { width, height })}
      alt={alt}
      unoptimized={!shouldOptimize}
      placeholder={isValidBlur ? "blur" : "empty"}
      blurDataURL={isValidBlur ? blur : undefined}
      onError={handleError}
      className={className}
      {...rest}
    />
  );
}
