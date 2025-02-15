'use client';

import FooterIcon from './FooterIcon';
import progress from '@/utils/progress';
import { useBroadcast } from '@/store/useBroadcast';
import { useEffect } from 'react';

export default function Footer() {
    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);

    useEffect(() => {
        const handleProgressBar = (message) => {
            if (message.action == 'loadStart' && progress.state == '') {
                progress.state = 'sending';
                progress.show();
            }
            if (message.action == 'loadEnd') {
                progress.full();
            }
            if (message.action == 'loadError') progress.error();
        };
        registerBroadcast(handleProgressBar);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast]);

    return (
        <footer>
            <div id='icons-left'>
                <nav>
                    <FooterIcon />
                </nav>
            </div>
            <div
                id='icons-right'
                className='loading loaded'
                style={{ '--i': 1 }}
                data-umami-event='footer-message-bar'
            >
                <div id='message-bar'>
                    <a></a>
                </div>
            </div>
        </footer>
    );
}
