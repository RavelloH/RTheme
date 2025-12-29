import React from "react";
import CMSImage from "@/components/CMSImage";
import Link from "@/components/Link";
import { codeToHtml } from "shiki";
import type { Components } from "react-markdown";
import type { MDXComponents } from "next-mdx-remote-client/rsc";
import { processImageUrl, type MediaFileInfo } from "@/lib/shared/image-utils";

/**
 * 渲染适配器
 * 统一 Markdown 和 MDX 的组件渲染配置
 * 只需定义一次，同时应用到两种模式
 */

/**
 * 代码块组件（使用 Shiki 高亮）
 */
const CodeBlock = async ({
  children,
  className,
}: {
  children?: string | string[];
  className?: string;
}) => {
  const language = className?.replace(/language-/, "") || "text";
  const code = (
    Array.isArray(children) ? children.join("") : String(children)
  ).replace(/\n$/, "");

  try {
    const html = await codeToHtml(code, {
      lang: language,
      themes: {
        light: "light-plus",
        dark: "dark-plus",
      },
    });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (err) {
    console.error("Shiki 语法高亮错误:", {
      error: err,
      language,
      codeLength: code.length,
    });

    return (
      <pre className="shiki">
        <code>{code}</code>
      </pre>
    );
  }
};

/**
 * 行内代码组件
 */
const InlineCode = ({ children }: { children?: string | string[] }) => {
  const text = Array.isArray(children) ? children.join("") : String(children);

  return <code>{text}</code>;
};

/**
 * 图片组件的 Props 类型
 */
interface ImageComponentProps {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  mediaFileMap?: Map<string, MediaFileInfo>;
}

/**
 * 图片组件 - 统一配置
 */
const ImageComponent = ({
  src,
  alt,
  width,
  height,
  mediaFileMap,
}: ImageComponentProps) => {
  const imgSrc = typeof src === "string" ? src : "";
  const imgAlt = alt || "";

  // 尝试从媒体文件映射中获取图片信息
  let imgWidth = width ? Number(width) : undefined;
  let imgHeight = height ? Number(height) : undefined;
  let blur: string | undefined;

  if (mediaFileMap && imgSrc) {
    // 使用 processImageUrl 处理图片URL
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
    <div>
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
      <div className="text-center text-muted-foreground text-sm mb-2">
        {imgAlt}
      </div>
    </div>
  );
};

/**
 * 链接组件 - 统一配置
 */
const LinkComponent = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode;
  href?: string;
} & React.HTMLAttributes<HTMLAnchorElement>) => {
  const isExternal = href?.startsWith("http");

  return (
    <Link
      href={href || ""}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      presets={[
        "hover-underline",
        isExternal ? "arrow-out" : "arrow",
        isExternal ? "dynamic-icon" : "",
      ]}
      {...props}
    >
      {children}
    </Link>
  );
};

/**
 * 创建统一的基础组件配置
 * 支持传递媒体文件映射
 */
const createBaseComponents = (mediaFileMap?: Map<string, MediaFileInfo>) =>
  ({
    // 代码处理
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    code: ({
      children,
      className,
    }: {
      children?: string | string[];
      className?: string;
    }) => {
      // 如果有 className (通常是 language-*), 说明是代码块
      if (className) {
        return (
          <CodeBlock className={className}>{children as string}</CodeBlock>
        );
      }
      return <InlineCode>{children as string}</InlineCode>;
    },

    // 链接
    a: LinkComponent,

    // 图片
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { src, alt, width, height } = props;
      return (
        <ImageComponent
          src={typeof src === "string" ? src : undefined}
          alt={alt}
          width={width}
          height={height}
          mediaFileMap={mediaFileMap}
        />
      );
    },

    // 表格
    table: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.TableHTMLAttributes<HTMLTableElement>) => (
      <table {...props}>{children}</table>
    ),
    thead: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLTableSectionElement>) => (
      <thead {...props}>{children}</thead>
    ),
    tbody: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLTableSectionElement>) => (
      <tbody {...props}>{children}</tbody>
    ),
    tr: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLTableRowElement>) => (
      <tr {...props}>{children}</tr>
    ),
    th: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
      <th {...props}>{children}</th>
    ),
    td: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
      <td {...props}>{children}</td>
    ),

    // 其他元素（样式由 content.css 处理）
    // 注意：react-markdown 和 MDX 会传递 node 属性（AST 节点），需要过滤掉避免渲染到 HTML
    p: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
    ul: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLUListElement>) => (
      <ul {...props}>{children}</ul>
    ),
    ol: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLOListElement>) => (
      <ol {...props}>{children}</ol>
    ),
    li: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.LiHTMLAttributes<HTMLLIElement>) => (
      <li {...props}>{children}</li>
    ),
    blockquote: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.BlockquoteHTMLAttributes<HTMLElement>) => (
      <blockquote {...props}>{children}</blockquote>
    ),
    hr: ({
      node: _node,
      ...props
    }: { node?: unknown } & React.HTMLAttributes<HTMLHRElement>) => (
      <hr {...props} />
    ),

    // MDX 特有元素（样式由 content.css 处理）
    del: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.DelHTMLAttributes<HTMLElement>) => (
      <del {...props}>{children}</del>
    ),
    u: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLElement>) => <u {...props}>{children}</u>,
    mark: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLElement>) => (
      <mark {...props}>{children}</mark>
    ),
    sup: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLElement>) => <sup {...props}>{children}</sup>,
    sub: ({
      children,
      node: _node,
      ...props
    }: {
      children?: React.ReactNode;
      node?: unknown;
    } & React.HTMLAttributes<HTMLElement>) => <sub {...props}>{children}</sub>,
  }) as const;

/**
 * 获取 react-markdown 的组件配置
 */
export function getMarkdownComponents(
  mediaFileMap?: Map<string, MediaFileInfo>,
): Components {
  return createBaseComponents(mediaFileMap) as Components;
}

/**
 * 获取 MDX 的组件配置
 */
export function getMDXComponents(
  mediaFileMap?: Map<string, MediaFileInfo>,
): MDXComponents {
  return createBaseComponents(mediaFileMap) as MDXComponents;
}
