"use client";

import { useEffect } from 'react';
import { useBroadcast } from '@/store/useBroadcast';
import message from '@/utils/message';

export default function MenuLoader() {
    const broadcast = useBroadcast((state) => state.broadcast);

    useEffect(() => {
        message.original = (
            <a
                onClick={() =>
                    broadcast({
                        action: 'openInfobar',
                        target: 'menu',
                    })
                }>
                目录&nbsp;<span class='i ri-list-unordered'></span>
            </a>
        );
        setTimeout(() => 
        message.switch(message.original),500);
    }, []);

    return;
}
