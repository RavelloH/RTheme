import { MDXRemote } from "next-mdx-remote-client/rsc";
import { MDXComponents } from "next-mdx-remote-client/rsc";
import { codeToHtml } from "shiki";
import React from "react";
import Image from "next/image";

interface MDXRendererProps {
  source: string;
  mode: "markdown" | "mdx";
}

// 代码块组件
const CodeBlock = async ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  const language = className?.replace(/language-/, "") || "text";
  const code = String(children).replace(/\n$/, "");

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
    console.error("Shiki highlighting error:", err);
    // 回退到普通代码块
    return (
      <pre className="shiki">
        <code>{code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>
      </pre>
    );
  }
};

// 行内代码组件
const InlineCode = ({ children }: { children?: React.ReactNode }) => {
  return (
    <code className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm">
      {children}
    </code>
  );
};

// MDX 组件映射
const components: MDXComponents = {
  // 处理代码块: pre > code 结构
  pre: ({ children }: React.ComponentPropsWithoutRef<"pre">) => <>{children}</>,
  code: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    // 如果有 className (通常是 language-*), 说明是代码块
    // 如果没有 className, 说明是行内代码
    if (className) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return <InlineCode>{children}</InlineCode>;
  },
  // 表格元素
  table: ({ children }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: React.ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-foreground/5">{children}</thead>
  ),
  tbody: ({ children }: React.ComponentPropsWithoutRef<"tbody">) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: React.ComponentPropsWithoutRef<"tr">) => (
    <tr className="border-b border-foreground/10">{children}</tr>
  ),
  th: ({ children }: React.ComponentPropsWithoutRef<"th">) => (
    <th className="px-4 py-2 text-left font-semibold border border-foreground/20">
      {children}
    </th>
  ),
  td: ({ children }: React.ComponentPropsWithoutRef<"td">) => (
    <td className="px-4 py-2 border border-foreground/20">{children}</td>
  ),
  // 删除线
  del: ({ children }: React.ComponentPropsWithoutRef<"del">) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),
  // 下划线
  u: ({ children }: React.ComponentPropsWithoutRef<"u">) => (
    <u className="underline">{children}</u>
  ),
  // 高亮标记
  mark: ({ children }: React.ComponentPropsWithoutRef<"mark">) => (
    <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
      {children}
    </mark>
  ),
  // 上标
  sup: ({ children }: React.ComponentPropsWithoutRef<"sup">) => (
    <sup className="text-xs align-super">{children}</sup>
  ),
  // 下标
  sub: ({ children }: React.ComponentPropsWithoutRef<"sub">) => (
    <sub className="text-xs align-sub">{children}</sub>
  ),
  // 段落 - 支持自定义样式（如文本对齐）
  p: ({ children, style }: React.ComponentPropsWithoutRef<"p">) => (
    <p style={style} className="my-4 leading-relaxed">
      {children}
    </p>
  ),
  // 标题
  h1: ({ children, id, ...props }: React.ComponentPropsWithoutRef<"h1">) => (
    <h1
      id={id}
      className="text-4xl font-bold mt-8 mb-4 first:mt-0 scroll-mt-20"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, id, ...props }: React.ComponentPropsWithoutRef<"h2">) => (
    <h2
      id={id}
      className="text-3xl font-bold mt-6 mb-3 first:mt-0 scroll-mt-20"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, id, ...props }: React.ComponentPropsWithoutRef<"h3">) => (
    <h3
      id={id}
      className="text-2xl font-bold mt-4 mb-2 first:mt-0 scroll-mt-20"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, id, ...props }: React.ComponentPropsWithoutRef<"h4">) => (
    <h4
      id={id}
      className="text-xl font-bold mt-3 mb-2 first:mt-0 scroll-mt-20"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, id, ...props }: React.ComponentPropsWithoutRef<"h5">) => (
    <h5
      id={id}
      className="text-lg font-bold mt-2 mb-1 first:mt-0 scroll-mt-20"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, id, ...props }: React.ComponentPropsWithoutRef<"h6">) => (
    <h6
      id={id}
      className="text-base font-bold mt-2 mb-1 first:mt-0 scroll-mt-20"
      {...props}
    >
      {children}
    </h6>
  ),
  // 列表
  ul: ({ children }: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc list-inside my-4 space-y-1">{children}</ul>
  ),
  ol: ({ children }: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal list-inside my-4 space-y-1">{children}</ol>
  ),
  li: ({ children }: React.ComponentPropsWithoutRef<"li">) => (
    <li className="my-1">{children}</li>
  ),
  // 引用
  blockquote: ({ children }: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-4 border-foreground/20 pl-4 my-4 italic">
      {children}
    </blockquote>
  ),
  // 水平线
  hr: () => <hr className="border-foreground/20 my-8" />,
  // 链接
  a: ({ children, href, ...props }: React.ComponentPropsWithoutRef<"a">) => (
    <a
      href={href}
      className="text-blue-600 dark:text-blue-400 hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  // 图片 - 使用 Next.js Image 组件
  img: ({
    src,
    alt,
    ...props
  }: {
    src?: string;
    alt?: string;
    [key: string]: unknown;
  }) => {
    // 对于外部 URL，需要特殊处理
    const isExternal = typeof src === "string" && src.startsWith("http");
    if (isExternal) {
      return (
        <Image
          src={src}
          alt={alt || ""}
          className="max-w-full h-auto rounded-lg shadow-sm my-4"
          {...props}
        />
      );
    }

    return (
      <div className="relative my-4">
        <Image
          src={src || ""}
          alt={alt || ""}
          width={800}
          height={400}
          className="rounded-lg shadow-sm object-contain"
          {...props}
        />
      </div>
    );
  },
};

// 全局标题计数器
let headingCounter = 0;

// 重置标题计数器（每次渲染新内容时调用）
const resetHeadingCounter = () => {
  headingCounter = 0;
};

// 生成带数字后缀的 slug（避免CSS选择器问题）
const generateSlug = (text: string): string => {
  headingCounter++;
  const baseSlug = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // 确保baseSlug不为空，如果为空使用 'heading'
  const safeBaseSlug = baseSlug || "heading";

  // 将数字放在后缀，避免CSS选择器以数字开头的问题
  return `${safeBaseSlug}-${headingCounter}`;
};

// 将标题组件添加到 components 对象中
// h1 组件渲染为 h2（因为文章内容通常不需要 h1）
components.h1 = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"h1">) => {
  const text = React.Children.toArray(children).join("");
  const id = generateSlug(text);
  return (
    <h2 id={id} {...props}>
      {children}
    </h2>
  );
};

components.h2 = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"h2">) => {
  const text = React.Children.toArray(children).join("");
  const id = generateSlug(text);
  return (
    <h2 id={id} {...props}>
      {children}
    </h2>
  );
};

components.h3 = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"h3">) => {
  const text = React.Children.toArray(children).join("");
  const id = generateSlug(text);
  return (
    <h3 id={id} {...props}>
      {children}
    </h3>
  );
};

components.h4 = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"h4">) => {
  const text = React.Children.toArray(children).join("");
  const id = generateSlug(text);
  return (
    <h4 id={id} {...props}>
      {children}
    </h4>
  );
};

components.h5 = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"h5">) => {
  const text = React.Children.toArray(children).join("");
  const id = generateSlug(text);
  return (
    <h5 id={id} {...props}>
      {children}
    </h5>
  );
};

components.h6 = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"h6">) => {
  const text = React.Children.toArray(children).join("");
  const id = generateSlug(text);
  return (
    <h6 id={id} {...props}>
      {children}
    </h6>
  );
};

export default function MDXRenderer({ source, mode }: MDXRendererProps) {
  // 重置标题计数器，确保每次渲染新内容时都从1开始
  resetHeadingCounter();

  if (mode === "mdx") {
    return (
      <div className="max-w-4xl mx-auto">
        <MDXRemote source={source} components={components} />
      </div>
    );
  }

  // Markdown 模式：处理标题 id 后渲染 HTML
  const processMarkdownHeadings = (html: string): string => {
    // 重置计数器以确保 Markdown 模式也从头开始
    resetHeadingCounter();

    return html.replace(
      /<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/g,
      (match, level, attrs, content) => {
        // 提取纯文本内容
        const textContent = content.replace(/<[^>]*>/g, "");
        const id = generateSlug(textContent);

        // 将 h1 转换为 h2，其他级别保持不变
        const finalLevel = level === "1" ? "2" : level;

        // 如果已经有 id 属性，只处理标签转换
        if (attrs.includes("id=")) {
          return `<h${finalLevel}${attrs}>${content}</h${finalLevel}>`;
        }

        // 添加 id 并转换标签
        return `<h${finalLevel}${attrs} id="${id}">${content}</h${finalLevel}>`;
      },
    );
  };

  return (
    <div
      className="max-w-4xl mx-auto md-content"
      dangerouslySetInnerHTML={{ __html: processMarkdownHeadings(source) }}
    />
  );
}
