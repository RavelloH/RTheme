import prisma from "@/lib/server/prisma";
import { notFound } from "next/navigation";
import { TextVersion } from "text-version";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { serialize } from "next-mdx-remote-client/serialize";
import MarkdownIt from "markdown-it";
import markdownItMark from "markdown-it-mark";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import { codeToHtml } from "shiki";

export interface PostData {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPinned: boolean;
  allowComments: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  featuredImage: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  robotsIndex: boolean;
  postMode: "MARKDOWN" | "MDX";
  author: {
    uid: number;
    username: string;
    nickname: string | null;
  };
  categories: Array<{
    id: number;
    name: string;
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  _count: {
    comments: number;
  };
}

export interface RenderedContent {
  html: string;
  mode: "markdown" | "mdx";
}

/**
 * 获取公开的文章数据
 * 只返回已发布且未被删除的文章
 */
export async function getPublishedPost(slug: string): Promise<PostData> {
  const post = await prisma.post.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      status: true,
      isPinned: true,
      allowComments: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      featuredImage: true,
      metaDescription: true,
      metaKeywords: true,
      robotsIndex: true,
      postMode: true,
      author: {
        select: {
          uid: true,
          username: true,
          nickname: true,
        },
      },
      categories: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        select: {
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          comments: {
            where: {
              status: "APPROVED",
              deletedAt: null,
            },
          },
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  return post;
}

/**
 * 渲染 Markdown 内容为 HTML
 */
export async function renderMarkdown(content: string): Promise<string> {
  // 初始化 markdown-it 实例
  const md = new MarkdownIt({
    html: true, // 启用 HTML 标签
    linkify: true, // 自动转换 URL 为链接
    typographer: true, // 启用一些语言中立的替换 + 引号美化
    breaks: false, // 转换段落里的 '\n' 到 <br>
  })
    .use(markdownItMark) // 支持 ==高亮==
    .use(markdownItSub) // 支持 ~下标~
    .use(markdownItSup); // 支持 ^上标^

  // 渲染 markdown
  let html = md.render(content);

  // 使用 Shiki 高亮代码块
  const codeBlockRegex =
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g;
  const matches = Array.from(html.matchAll(codeBlockRegex));

  // 并行处理所有代码块高亮
  const highlightedBlocks = await Promise.all(
    matches.map(async (match) => {
      const [fullMatch, lang, code] = match;

      // 跳过无效匹配
      if (!lang || !code) return { fullMatch, highlighted: fullMatch };

      // 解码 HTML 实体
      const decodedCode = code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      try {
        const highlighted = await codeToHtml(decodedCode, {
          lang: lang as string,
          themes: {
            light: "light-plus",
            dark: "dark-plus",
          },
        });
        return { fullMatch, highlighted };
      } catch (err) {
        console.error(`Failed to highlight code block (${lang}):`, err);
        return { fullMatch, highlighted: fullMatch };
      }
    }),
  );

  // 替换所有高亮的代码块
  for (const { fullMatch, highlighted } of highlightedBlocks) {
    html = html.replace(fullMatch, highlighted);
  }

  return html;
}

/**
 * 序列化 MDX 内容
 */
export async function serializeMDX(
  content: string,
): Promise<{ content: string }> {
  try {
    const result = await serialize({
      source: content,
      options: {
        mdxOptions: {
          format: "mdx",
          development: false,
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug, // 为标题添加 id
            // 注意：代码高亮在 MDXRenderer 组件中使用 shiki 处理
          ],
        },
        parseFrontmatter: true,
      },
    });

    // 处理不同的结果类型
    if ("compiledSource" in result) {
      return { content: (result as any).compiledSource };
    } else if ("content" in result) {
      return { content: (result as any).content };
    } else {
      throw new Error("无法获取序列化后的内容");
    }
  } catch (error) {
    console.error("MDX serialization error:", error);
    throw new Error("MDX 内容序列化失败");
  }
}

/**
 * 渲染文章内容
 */
export async function renderPostContent(
  post: PostData,
): Promise<RenderedContent> {
  // 使用 text-version 获取最新版本的内容
  const tv = new TextVersion();
  const latestContent = tv.latest(post.content);

  if (post.postMode === "MARKDOWN") {
    const html = await renderMarkdown(latestContent);
    return { html, mode: "markdown" };
  } else if (post.postMode === "MDX") {
    const mdxSource = await serializeMDX(latestContent);
    return { html: mdxSource.content, mode: "mdx" };
  } else {
    throw new Error(`Unsupported post mode: ${post.postMode}`);
  }
}
