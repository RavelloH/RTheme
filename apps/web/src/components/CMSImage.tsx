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
  /** 是否优化（默认 true） */
  optimized?: boolean;
  /** blur 占位图数据（需要是完整的 data URL 格式） */
  blur?: string | null;
}

export default function CMSImage({
  src,
  width,
  height,
  fill,
  optimized = true,
  blur,
  alt,
  onError,
  className,
  ...rest
}: CMSImageProps) {
  const [hasError, setHasError] = useState(false);

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
      unoptimized={!optimized}
      placeholder={isValidBlur ? "blur" : "empty"}
      blurDataURL={isValidBlur ? blur : undefined}
      onError={handleError}
      className={className}
      {...rest}
    />
  );
}
