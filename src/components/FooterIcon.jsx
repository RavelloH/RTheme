'use client';
import { useState, useEffect } from 'react';
import config from '../../config';
import global from '@/assets/js/Global';

let footerList = config.footer.map((item, index) => {
    return (
        <a
            className='loading loaded'
            style={{ '--i': index + 3 }}
            key={index}
            href={item.href || ''}
            id={item.id}
            onClick={item.additions.onclick || function () {}}
            aria-label={item.additions.ariaLabel}
            data-pjax-state=''
            data-umami-event={item.additions.umamiEvent || ''}
            target={item.additions.target || ''}>
            <span className={'i ' + item.icon}></span>
        </a>
    );
});

export default function FooterIcon() {
    const [hasNewNotices, setHasNewNotices] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            const cacheData = JSON.parse(localStorage.getItem('noticeCache') || '{}');
            setHasNewNotices(cacheData.unread && cacheData.unread.length > 0);
        }, 2000);
    }, []);

    return (
        <>
            <a
                className='loading loaded'
                style={{ '--i': 1 }}
                key={1}
                href='#info'
                id='icon-about'
                onClick={() => {
                    global.openInfoBar('info');
                    return false;
                }}
                aria-label='about this page'
                data-pjax-state=''
                data-umami-event='footer-关于'
                target='_self'>
                <span className={'i ' + 'ri-compass-discover-line'}></span>
            </a>
            <a
                className={`loading loaded ${hasNewNotices ? 'highlight' : ''}`}
                style={{ '--i': 2 }}
                key={2}
                onClick={() => {
                    global.toggleLayoutNoticebar();
                    return false;
                }}
                href='#notice'
                id='icon-notice'
                aria-label='about this page'
                data-pjax-state=''
                data-umami-event='footer-关于'
                target='_self'>
                <span className={`i ri-notification-2-line ${hasNewNotices ? 'breathI' : ''}`} id='icon-notice-span'></span>
                {hasNewNotices ? <span className='ripple active'></span> : <span className='ripple'></span>}
            </a>
            {footerList}

            <a
                className='loading loaded'
                style={{ '--i': footerList.length + 1 }}
                key={footerList.length + 1}
                href='#rss'
                id='icon-rss'
                onClick={() => {
                    global.openInfoBar('feed');
                    return false;
                }}
                aria-label='my rss'
                data-pjax-state=''
                data-umami-event='footer-RSS'
                target='_self'>
                <span className={'i ' + 'ri-rss-fill'}></span>
            </a>
        </>
    );
}
