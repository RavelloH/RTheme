'use client';

import { useEffect, useState } from 'react';
import config from '../../config';
import { useBroadcast } from '@/store/useBoardcast';
import switchElementContent from '@/utils/switchElement';

export default function LoadingShade() {
    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);
    const boardcast = useBroadcast((state) => state.broadcast);

    const [loadComplete, setLoadComplete] = useState(false);

    useEffect(() => {
        const removeLoadShade = (message) => {
            if (message.type === 'UI') {
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
            }
        };
        registerBroadcast(removeLoadShade);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast]);

    useEffect(() => {
        boardcast({
            type: 'UI',
            action: 'firstLoadComplete',
        });
    }, [boardcast]);

    return (
        <>
            <div id='shade-global'></div>
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
