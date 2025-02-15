'use client';

import { useBroadcast } from '@/store/useBroadcast';
import { useEffect } from 'react';

function loadItems(parentNodeName, mode = 'sort') {
    if (mode == 'sort') {
        for (let j = document.querySelectorAll(parentNodeName + ' .loading').length; j > 0; j--) {
            document
                .querySelectorAll(parentNodeName + ' .loading')
                [j - 1].setAttribute('style', '--i: ' + j);
        }
    }
    document.querySelectorAll(parentNodeName + ' .loading').forEach((e) => {
        e.classList.add('loaded');
    });
    document.querySelectorAll('.loading:not(.listprogram)').forEach((e) => {
        e.classList.add('loaded');
    });
}

export default function Starter() {
    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);

    useEffect(() => {
        const handleProgressBar = (message) => {
            if (message.action == 'loadEnd' || message.action == 'loadError') {
                setTimeout(() => {
                    loadItems('#main');
                }, 300);
            }
            if (message.action == 'firstLoadComplete') {
                setTimeout(() => {
                    loadItems('#main');
                }, 1200);
            }
        };
        registerBroadcast(handleProgressBar);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast]);
}
