'use client';

import config from '../../config';
import global from '@/assets/js/Global';

let footerList = config.footer.map((item, index) => {
    return (
        <a
            className='loading loaded'
            style={{ '--i': index + 2 }}
            key={index}
            href={item.href || ''}
            id={item.id}
            onClick={item.additions.onclick || function () {}}
            aria-label={item.additions.ariaLabel}
            data-pjax-state=''
            data-umami-event={item.additions.umamiEvent || ''}
            target={item.additions.target || ''}
        >
            <span className={'i ' + item.icon}></span>
        </a>
    );
});

export default function FooterIcon() {
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
                target='_self'
            >
                <span className={'i ' + 'ri-compass-discover-line'}></span>
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
                target='_self'
            >
                <span className={'i ' + 'ri-rss-fill'}></span>
            </a>
        </>
    );
}
