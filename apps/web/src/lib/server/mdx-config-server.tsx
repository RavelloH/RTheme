/**
 * 服务器端 Markdown 渲染配置
 *
 * 此文件包含服务器端专用的渲染组件和配置
 * - 异步代码高亮组件
 * - 服务器端组件定义
 * - react-markdown 组件配置
 */

import React from "react";
import type { Components, ExtraProps } from "react-markdown";
import { codeToHtml } from "shiki";

import CMSImage from "@/components/ui/CMSImage";
import Link from "@/components/ui/Link";
import { type MediaFileInfo, processImageUrl } from "@/lib/shared/image-utils";
import {
  createShikiConfig,
  normalizeCodeLanguage,
  renderPlainCodeBlockHtml,
  type ShikiTheme,
  shouldSilenceShikiError,
} from "@/lib/shared/mdx-config-shared";

// ============ 服务器端组件 ============
const MARKDOWN_IMAGE_SIZES = "(max-width: 56rem) 100vw, 56rem";

function parsePositiveDimension(value?: string | number): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function extractCodeText(children?: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children
      .map((child) => (typeof child === "string" ? child : ""))
      .join("");
  }

  return "";
}

function isBlockCodeNode(node?: ExtraProps["node"]): boolean {
  const startLine = node?.position?.start?.line;
  const endLine = node?.position?.end?.line;

  return (
    typeof startLine === "number" &&
    typeof endLine === "number" &&
    endLine > startLine
  );
}

/**
 * 服务器端代码块组件
 * 使用异步 Shiki 高亮，在服务器端完成渲染
 */
export async function CodeBlockServer({
  children,
  className,
  shikiTheme,
}: {
  children?: string;
  className?: string;
  shikiTheme?: ShikiTheme;
}) {
  const language = className?.replace(/language-/, "") || "text";
  const code = String(children ?? "").replace(/\n$/, "");
  const resolvedLanguage = normalizeCodeLanguage(language);
  const config = createShikiConfig(shikiTheme);

  if (resolvedLanguage.textMode) {
    try {
      const textHtml = await codeToHtml(code, {
        lang: "text",
        ...config,
      });
      return <div dangerouslySetInnerHTML={{ __html: textHtml }} />;
    } catch (err) {
      if (!shouldSilenceShikiError(err)) {
        console.error("Shiki 服务端 text 模式渲染失败:", {
          error: err,
          language,
        });
      }
      const fallbackHtml = renderPlainCodeBlockHtml(code);
      return <div dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }
  }

  try {
    const html = await codeToHtml(code, {
      lang: resolvedLanguage.normalized,
      ...config,
    });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (err) {
    if (!shouldSilenceShikiError(err)) {
      console.error("Shiki 服务端语法高亮错误:", {
        error: err,
        language,
        normalizedLanguage: resolvedLanguage.normalized,
      });
    }

    try {
      const textHtml = await codeToHtml(code, {
        lang: "text",
        ...config,
      });
      return <div dangerouslySetInnerHTML={{ __html: textHtml }} />;
    } catch (retryErr) {
      if (!shouldSilenceShikiError(retryErr)) {
        console.error("Shiki 服务端 text 回退渲染失败:", {
          error: retryErr,
          language,
          normalizedLanguage: resolvedLanguage.normalized,
        });
      }
      const fallbackHtml = renderPlainCodeBlockHtml(code);
      return <div dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }
  }
}

/**
 * 服务器端图片组件
 * 支持媒体文件映射和优化
 */
export function ImageComponentServer({
  src,
  alt,
  width,
  height,
  mediaFileMap,
}: {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  mediaFileMap?: Map<string, MediaFileInfo>;
}) {
  const imgSrc = typeof src === "string" ? src : "";
  const imgAlt = alt || "";

  // 尝试从媒体文件映射中获取图片信息
  let imgWidth = parsePositiveDimension(width);
  let imgHeight = parsePositiveDimension(height);
  let hasKnownWidth = imgWidth !== undefined;
  let blur: string | undefined;

  if (mediaFileMap && imgSrc) {
    const processedImages = processImageUrl(imgSrc, mediaFileMap);
    const imageInfo = processedImages[0];

    if (imageInfo) {
      const mappedWidth = parsePositiveDimension(imageInfo.width);
      const mappedHeight = parsePositiveDimension(imageInfo.height);
      if (mappedWidth !== undefined) {
        imgWidth = mappedWidth;
        hasKnownWidth = true;
      }
      if (mappedHeight !== undefined) {
        imgHeight = mappedHeight;
      }
      blur = imageInfo.blur || blur;
    }
  }

  // 如果没有获取到尺寸信息，使用默认值
  imgWidth = imgWidth || 800;
  imgHeight = imgHeight || 400;
  const imageStyle = hasKnownWidth
    ? { width: `min(100%, ${imgWidth}px)`, height: "auto" }
    : { width: "auto", maxWidth: "100%", height: "auto" };

  return (
    <span className="block relative my-4">
      <CMSImage
        src={imgSrc}
        alt={imgAlt}
        width={imgWidth}
        height={imgHeight}
        blur={blur}
        optimized={!!(blur && imgWidth && imgHeight)}
        sizes={MARKDOWN_IMAGE_SIZES}
        style={imageStyle}
        data-lightbox="true"
      />
      {imgAlt && (
        <span className="block text-center text-muted-foreground text-sm mt-2">
          {imgAlt}
        </span>
      )}
    </span>
  );
}

/**
 * 服务器端链接组件的 Props 类型定义
 */
interface LinkComponentServerProps {
  children?: React.ReactNode;
  href?: string;
  className?: string;
  title?: string;
}

/**
 * 服务器端链接组件
 */
export function LinkComponentServer({
  children,
  href,
  className,
  title,
}: LinkComponentServerProps) {
  const isExternal = href?.startsWith("http");

  return (
    <Link
      href={href || ""}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={className}
      title={title}
      presets={[
        "hover-underline",
        isExternal ? "arrow-out" : "arrow",
        isExternal ? "dynamic-icon" : "",
      ]}
    >
      {children}
    </Link>
  );
}

// ============ 组件配置工厂函数 ============

/**
 * 创建服务器端 react-markdown 组件配置
 *
 * @param mediaFileMap - 媒体文件映射（用于图片优化）
 * @param shikiTheme - 可选的 Shiki 主题配置
 * @returns react-markdown 组件配置对象
 */
export function createServerMarkdownComponents(
  mediaFileMap?: Map<string, MediaFileInfo>,
  shikiTheme?: ShikiTheme,
): Components {
  return {
    // 代码处理
    pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
      <>{children}</>
    ),
    code: async (props: React.HTMLAttributes<HTMLElement> & ExtraProps) => {
      const { children, className, node, ...rest } = props;
      const isBlockCode = Boolean(className) || isBlockCodeNode(node);

      if (isBlockCode) {
        // 代码块 - 使用服务端高亮
        return (
          <CodeBlockServer
            className={className || "language-text"}
            shikiTheme={shikiTheme}
          >
            {extractCodeText(children)}
          </CodeBlockServer>
        );
      }

      // 行内代码
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    },

    // 链接
    a: LinkComponentServer,

    // 图片
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { src, alt, width, height } = props;
      return (
        <ImageComponentServer
          src={typeof src === "string" ? src : undefined}
          alt={alt}
          width={width}
          height={height}
          mediaFileMap={mediaFileMap}
        />
      );
    },

    // 表格容器 - 添加横向滚动
    table: ({ children, ...rest }: React.HTMLAttributes<HTMLTableElement>) => (
      <div className="overflow-x-auto my-6">
        <table {...rest}>{children}</table>
      </div>
    ),
  } as Components;
}
