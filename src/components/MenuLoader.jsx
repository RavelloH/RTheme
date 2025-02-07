'use client';

import { useEffect } from 'react';
import { useEvent } from '@/store/useEvent';
import message from '@/utils/message';
import { useBroadcast } from '@/store/useBroadcast';

export default function MenuLoader() {
    const { emit } = useEvent();
    const { registerCallback, unregisterCallback } = useBroadcast();

    useEffect(() => {
        setTimeout(() => {
            message.original = (
                <a onClick={() => emit('openInfobar', 'menu')}>
                    目录&nbsp;<span class='i ri-list-unordered'></span>
                </a>
            );
            message.switch(message.original);
        }, 500);
    }, []);

    return;
}
