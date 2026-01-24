/**
 * 服务器端 Markdown 渲染配置
 *
 * 此文件包含服务器端专用的渲染组件和配置
 * - 异步代码高亮组件
 * - 服务器端组件定义
 * - react-markdown 组件配置
 */

import React from "react";
import { codeToHtml } from "shiki";
import type { Components } from "react-markdown";
import Link from "@/components/Link";
import CMSImage from "@/components/CMSImage";
import { shikiConfig } from "@/lib/shared/mdx-config-shared";
import { processImageUrl, type MediaFileInfo } from "@/lib/shared/image-utils";

// ============ 服务器端组件 ============

/**
 * 服务器端代码块组件
 * 使用异步 Shiki 高亮，在服务器端完成渲染
 */
export async function CodeBlockServer({
  children,
  className,
}: {
  children?: string;
  className?: string;
}) {
  const language = className?.replace(/language-/, "") || "text";
  const code = String(children).replace(/\n$/, "");

  try {
    const html = await codeToHtml(code, {
      lang: language,
      ...shikiConfig,
    });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (err) {
    console.error("Shiki 服务端语法高亮错误:", {
      error: err,
      language,
    });

    return (
      <pre className="shiki">
        <code>{code}</code>
      </pre>
    );
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
  let imgWidth = width ? Number(width) : undefined;
  let imgHeight = height ? Number(height) : undefined;
  let blur: string | undefined;

  if (mediaFileMap && imgSrc) {
    const processedImages = processImageUrl(imgSrc, mediaFileMap);
    const imageInfo = processedImages[0];

    if (imageInfo) {
      imgWidth = imageInfo.width || imgWidth;
      imgHeight = imageInfo.height || imgHeight;
      blur = imageInfo.blur || blur;
    }
  }

  // 如果没有获取到尺寸信息，使用默认值
  imgWidth = imgWidth || 800;
  imgHeight = imgHeight || 400;

  return (
    <span className="block relative my-4">
      <CMSImage
        src={imgSrc}
        alt={imgAlt}
        width={imgWidth}
        height={imgHeight}
        blur={blur}
        optimized={!!(blur && imgWidth && imgHeight)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
 * @returns react-markdown 组件配置对象
 */
export function createServerMarkdownComponents(
  mediaFileMap?: Map<string, MediaFileInfo>,
): Components {
  return {
    // 代码处理
    pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
      <>{children}</>
    ),
    code: async (props: React.HTMLAttributes<HTMLElement>) => {
      const { children, className } = props;

      if (className) {
        // 代码块 - 使用服务端高亮
        return (
          <CodeBlockServer className={className}>
            {children as string}
          </CodeBlockServer>
        );
      }

      // 行内代码
      return <code {...props}>{children}</code>;
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
