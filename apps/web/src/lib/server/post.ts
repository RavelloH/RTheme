import prisma from "@/lib/server/prisma";
import { notFound } from "next/navigation";
import { TextVersion } from "text-version";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { serialize } from "next-mdx-remote-client/serialize";

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
  viewCount: number;
}

export interface RenderedContent {
  content: string;
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
      viewCount: {
        select: {
          cachedCount: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  return {
    ...post,
    viewCount: post.viewCount?.cachedCount || 0,
  };
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
      return { content: (result as { compiledSource: string }).compiledSource };
    } else if ("content" in result) {
      return { content: (result as { content: string }).content };
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
  // text-version 获取最新版本的内容
  const tv = new TextVersion();
  const latestContent = tv.latest(post.content);

  if (post.postMode === "MARKDOWN") {
    // Markdown 模式：直接返回原始内容，由 react-markdown 在组件中渲染
    return { content: latestContent, mode: "markdown" };
  } else if (post.postMode === "MDX") {
    const mdxSource = await serializeMDX(latestContent);
    return { content: mdxSource.content, mode: "mdx" };
  } else {
    throw new Error(`Unsupported post mode: ${post.postMode}`);
  }
}
