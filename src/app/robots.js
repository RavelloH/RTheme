import config from '../../config';

export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/platform/', '/api'],
        },
        sitemap: config.siteURL + 'sitemap.xml',
    };
}
