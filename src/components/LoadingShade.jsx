'use client';

import { useEffect, useState } from 'react';
import config from '../../config';
import { useBroadcast } from '@/store/useBroadcast';
import switchElementContent from '@/utils/switchElement';
import messager from '@/utils/message';
import { useEvent } from '@/store/useEvent';

export default function LoadingShade() {
    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);
    const broadcast = useBroadcast((state) => state.broadcast);
    const { emit } = useEvent();

    const [loadComplete, setLoadComplete] = useState(false);

    useEffect(() => {
        const handlePageLoad = (message) => {
            if (message.action === 'firstLoadComplete') {
                setTimeout(() => {
                    setLoadComplete(true);
                    switchElementContent(
                        '#loading-text',
                        <span className='green-text'> Completed.</span>,
                    );
                }, 300);
                setTimeout(() => {
                    document.getElementById('load-shade').classList.remove('active');
                    document.getElementById('shade-global').classList.remove('active');
                }, 900);
            }
            if (message.action === 'loadStart') {
                document.getElementById('viewmap').style.transition = 'opacity 0.3s';
                document.getElementById('viewmap').style.opacity = 0;
                document.getElementById('viewmap').style.pointerEvents = 'none';
                broadcast({
                    action: 'closeUserbar',
                });
                broadcast({
                    action: 'closeNoticebar',
                });
                broadcast({
                    action: 'closeSidebar',
                });
                emit('closeInfobar');
            }
            if (message.action === 'loadEnd') {
                setTimeout(() => {
                    document.getElementById('viewmap').style.opacity = 1;
                    document.getElementById('viewmap').style.pointerEvents = 'auto';
                    messager.original = (
                        <a>
                            <div></div>
                        </a>
                    );
                    messager.switch(messager.original);
                }, 300);
            }
        };
        registerBroadcast(handlePageLoad);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast]);

    useEffect(() => {
        broadcast({
            type: 'UI',
            action: 'firstLoadComplete',
        });
    }, []);

    return (
        <>
            <div
                id='shade-global'
                onClick={() => {
                    broadcast({
                        action: 'closeUserbar',
                    });
                    broadcast({
                        action: 'closeNoticebar',
                    });
                    emit('closeInfobar');
                }}
            ></div>
            <div id='load-shade' className='active'>
                <div id='load-content'>
                    <hr />
                    <h2>{config.siteName}</h2>
                    <h3>
                        LOAD
                        <span id='loading-text'>
                            ing
                            <span className='breath'>
                                <span>.</span>
                                <span>.</span>
                                <span>.</span>
                            </span>
                        </span>
                    </h3>
                    <hr /> <br />
                </div>
            </div>
        </>
    );
}
