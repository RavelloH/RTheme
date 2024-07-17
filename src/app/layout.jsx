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

export const metadata = {
    title: config.siteName,
    description: config.description,
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
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}
