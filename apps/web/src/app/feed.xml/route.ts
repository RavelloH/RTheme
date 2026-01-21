import { Feed } from "feed";
import { getFeedData } from "@/lib/server/feed-data";
import { notFound } from "next/navigation";

export async function GET() {
  const { posts, siteConfig, rssConfig } = await getFeedData();

  if (!rssConfig.enabled) {
    return notFound();
  }

  const feed = new Feed({
    title: siteConfig.title,
    description: siteConfig.description,
    id: siteConfig.url,
    link: siteConfig.url,
    language: "zh-CN",
    image: `${siteConfig.url}/icon.png`,
    favicon: `${siteConfig.url}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${siteConfig.author}`,
    updated: posts.length > 0 ? new Date(posts[0]!.updatedAt) : new Date(),
    generator: "NeutralPress",
    feedLinks: {
      json: `${siteConfig.url}/feed.json`,
      atom: `${siteConfig.url}/feed.xml`,
    },
    author: {
      name: siteConfig.author,
      link: siteConfig.url,
    },
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteConfig.url}/posts/${post.slug}`,
      link: `${siteConfig.url}/posts/${post.slug}`,
      description: post.excerpt || undefined,
      content: post.content,
      author: [
        {
          name: post.author.nickname || post.author.username,
          link: siteConfig.url,
        },
      ],
      date: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      image: post.featuredImage
        ? `${siteConfig.url}${post.featuredImage}`
        : undefined,
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
