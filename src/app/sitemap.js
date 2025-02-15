import getDB from '@/utils/db';
import config from '../../config';

const post = await getDB('post');
const tag = await getDB('tag');
const category = await getDB('category');

// console.log(tag);

const siteURL = config.siteURL;

let links = [
    {
        url: siteURL,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 1,
    },
    {
        url: `${siteURL}about`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        url: `${siteURL}posts`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 1,
    },
];

post.forEach((p) => {
    if (!p.published) {
        return;
    }
    links.unshift({
        url: `${siteURL}posts/${p.name}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
    });
});

tag.forEach((t) => {
    links.push({
        url: `${siteURL}tags/${t.name}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
    });
});
category.forEach((c) => {
    links.push({
        url: `${siteURL}categories/${c.name}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
    });
});

export default function sitemap() {
    return links;
}
