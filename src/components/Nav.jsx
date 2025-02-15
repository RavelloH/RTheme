'use client';

import { useEffect } from 'react';
import config from '../../config';

import { useBroadcast } from '@/store/useBroadcast';

let navList = config.nav.map((item, index) => {
    return (
        <a
            key={index + 1}
            href={config.remotePath + item.link}
            className='loading'
            style={{ '--i': config.nav.length - index }}
            id={item.id}
        >
            {item.name}
        </a>
    );
});

export default function Nav() {
    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);

    useEffect(() => {
        const highlightNav = (message) => {
            if (message.action !== 'loadEnd') return;
            const name = window.location.pathname.split('/')[1];
            for (let i = 0; i < config.nav.length; i++) {
                if (config.nav[i].link.replaceAll('/', '') == name) {
                    document.querySelectorAll('#header-side nav a').forEach((element) => {
                        element.classList.remove('active');
                    });
                    document.querySelector('#' + config.nav[i].id).classList.add('active');
                    break;
                }
            }
        };

        highlightNav({ action: 'loadEnd' });

        registerBroadcast(highlightNav);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast]);

    return <nav>{navList}</nav>;
}
