import config from '../../config';

export default function manifest() {
    return {
        name: config.siteName,
        short_name: config.siteShortname,
        description: config.description,
        start_url: config.pwaStartURL,
        display: 'fullscreen',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [
            {
                src: '/icon/16x/',
                sizes: '16x16',
                type: 'image/png',
            },
            {
                src: '/icon/32x/',
                sizes: '32x32',
                type: 'image/png',
            },
            {
                src: '/icon/36x/',
                sizes: '36x36',
                type: 'image/png',
            },
            {
                src: '/icon/48x/',
                sizes: '48x48',
                type: 'image/png',
            },

            {
                src: '/icon/72x/',
                sizes: '72x72',
                type: 'image/png',
            },

            {
                src: '/icon/96x/',
                sizes: '96x96',
                type: 'image/png',
            },
            {
                src: '/icon/128x/',
                sizes: '128x128',
                type: 'image/png',
            },
            {
                src: '/icon/144x/',
                sizes: '144x144',
                type: 'image/png',
            },

            {
                src: '/icon/192x/',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon/512x/',
                sizes: '512x512',
                type: 'image/png',
            },

            {
                src: '/icon/1024x/',
                sizes: '1024x1024',
                type: 'image/png',
            },
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    };
}
