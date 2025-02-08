'use client';

import { useEffect } from 'react';
import { useEvent } from '@/store/useEvent';
import message from '@/utils/message';
import { useBroadcast } from '@/store/useBroadcast';

export default function MenuLoader() {
    const { emit } = useEvent();

    useEffect(() => {
        const timer = setInterval(() => {
            message.original = (
                <a onClick={() => emit('openInfobar', 'menu')} data-umami-event='post-menu'>
                    目录&nbsp;<span class='i ri-list-unordered'></span>
                </a>
            );
            if (document.querySelector('#message-bar').innerText !== '目录 ')
                message.switch(message.original, 0);
        }, 500);
        return () => {
            clearInterval(timer);
        };
    }, []);

    return;
}
