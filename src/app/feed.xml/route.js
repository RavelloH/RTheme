import RSS from 'rss';
import config from '../../../config';
import getDB from '@/utils/db';

const category = await getDB('category');
const categories = [];
category.forEach((c) => {
    categories.push(c.name);
});
export async function GET() {
    const feed = new RSS({
        title: config.title,
        description: config.description,
        feed_url: `${config.siteURL}feed.xml`,
        site_url: config.siteURL,
        image_url: config.iconImage,
        managingEditor: config.author,
        webMaster: config.webMaster,
        copyright: `${config.copyrightStartTime} - ${new Date().getFullYear()} ${config.author}`,
        language: config.lang,
        categories: categories,
        pubDate: new Date().toUTCString(),
        ttl: '60',
    });

    const data = await getDB('post');

    data.forEach((post) => {
        // console.log(post);
        if (!post.published) {
            return;
        }
        feed.item({
            title: post.title,
            guid: post.id,
            url: `${config.siteName}posts/${post.name}`,
            description: post.content,
            date: new Date(post.createdAt),
        });
    });

    return new Response(feed.xml(), {
        headers: {
            'content-type': 'application/xml',
        },
    });
}
