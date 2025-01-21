import '../assets/css/style.css';
import 'remixicon/fonts/remixicon.css';

import config from '../../config';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

import LoadingShade from '@/components/LoadingShade';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import Infobar from '@/components/Infobar';
import Userbar from '@/components/Userbar.jsx';

import '@/assets/js/Global';
import Noticebar from '@/components/Noticebar';

export const metadata = {
    title: {
        template: '%s | ' + config.siteName,
        default: config.siteName,
    },
    siteName: config.siteName,
    generator: 'RTheme',
    referrer: 'origin-when-cross-origin',
    description: config.description,
    metadataBase: new URL(config.siteURL),
    alternates: {
        types: {
            'application/rss+xml': [{ url: 'feed.xml', title: 'RSS 订阅' }],
        },
    },
    openGraph: {
        title: {
            template: '%s | ' + config.siteName,
            default: config.siteName,
        },
        description: config.description,
        siteName: config.siteName,
        images: [
            {
                url: `${config.screenshotApi}?url=${config.siteURL}&viewport=1600x800&waitUntil=networkidle0`,
                height: 800,
            },
            {
                url: `${config.screenshotApi}?url=${config.siteURL}&viewport=600x800&waitUntil=networkidle0`,
                width: 600,
                height: 800,
            },
        ],
        locale: config.lang,
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: {
            template: '%s | ' + config.siteName,
            default: config.siteName,
        },
        description: config.siteName,
        creator: config.twitterUsername,
        images: {
            url: `${config.screenshotApi}?url=${config.siteURL}&viewport=1600x800&waitUntil=networkidle0`,
            alt: config.siteShortname + "'s Screenshot",
        },
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang='zh'>
            <head></head>

            <body>
                <section id='showcase'>
                    <LoadingShade />
                    <Header />
                    <div id='shade-context'></div>
                    <div id='main' className='loading'>
                        <div id='viewmap'>{children}</div>
                    </div>
                    <Footer />
                </section>
                <section id='sidebar'>
                    <Sidebar />
                </section>
                <section id='infobar'>
                    <Infobar />
                </section>
                <section id='userbar'>
                    <Userbar />
                </section>
                <Noticebar />
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}
