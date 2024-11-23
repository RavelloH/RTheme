import RSS from 'rss';
import config from '../../../config';
import getDB from '@/utils/db';
import Shiki from '@shikijs/markdown-it';
import MarkdownIt from 'markdown-it';

const md = MarkdownIt({ html: true });
md.use(
    await Shiki({
        themes: {
            light: 'dark-plus',
            dark: 'dark-plus',
        },
    }),
);

const category = await getDB('category');
const categories = [];
category.forEach((c) => {
    categories.push(c.name);
});
export async function GET() {
    const feed = new RSS({
        title: config.siteName,
        description: config.description,
        feed_url: `${config.siteURL}feed.xml`,
        site_url: config.siteURL,
        image_url: `${config.siteURL}${config.iconImage}`,
        managingEditor: config.author,
        webMaster: config.author,
        copyright: `${config.copyrightStartTime} - ${new Date().getFullYear()} ${config.author}`,
        language: config.lang,
        categories: categories,
        pubDate: new Date().toUTCString(),
        ttl: '60',
    });

    const data = await getDB('post');

    // 倒序排列
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    data.forEach((post) => {
        // console.log(post);
        if (!post.published) {
            return;
        }
        feed.item({
            title: post.title,
            guid: post.id,
            url: `${config.siteName}posts/${post.name}`,
            description: md.render(post.content),
            date: new Date(post.createdAt),
        });
    });

    return new Response(feed.xml(), {
        headers: {
            'content-type': 'application/xml',
        },
    });
}
