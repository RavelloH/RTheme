'use client';

import { useEffect, useState } from 'react';
import config from '../../config';
import { useBroadcast } from '@/store/useBroadcast';
import switchElementContent from '@/utils/switchElement';
import messager from '@/utils/message';
import { useEvent } from '@/store/useEvent';
import loadURL from '@/utils/loadURL';
import { Base64 } from 'js-base64';
import analyzeURL from '@/utils/analyzeURL';
import message from '@/utils/message';

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
                    emit('musicLoad');
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
        if (analyzeURL(window.location.href, 'u') !== '') {
            setTimeout(() => loadURL(Base64.decode(analyzeURL(window.location.href, 'u'))), 300);
        }
        addEventListener('copy', (event) => {
            message.add(
                <a>
                    已复制 &nbsp;<span className='i ri-file-copy-2-line'></span>
                </a>,
                2000,
            );
        });
        addEventListener('cut', (event) => {
            message.add(
                <a>
                    已剪切 &nbsp;<span className='i ri-scissors-cut-line'></span>
                </a>,
                2000,
            );
        });
        addEventListener('paste', (event) => {
            message.add(
                <a>
                    已粘贴 &nbsp;<span className='i ri-chat-check-line'></span>
                </a>,
                2000,
            );
        });
        addEventListener('offline', (event) => {
            message.add(
                <a>
                    互联网连接已断开 <span className='i ri-cloud-off-line'></span>
                </a>,
                5000,
            );
        });
        window.onerror = function (msg, url, lineNo, columnNo, error) {
            var string = msg.toLowerCase();
            var substring = 'script error';
            let message = (
                <>
                    <hr />
                    <div class='center'>
                        <h2>初始化异常</h2>
                        <h3>
                            LOAD
                            <span id='loading-text'>
                                <span class='red-text'> Failed.</span>
                            </span>
                        </h3>
                        <p>
                            <strong>消息: </strong>${msg}
                        </p>
                        <p>
                            <strong>URL: </strong>${url}
                        </p>
                        <p>
                            <strong>行号: </strong>${lineNo}
                        </p>
                        <p>
                            <strong>列数: </strong>${columnNo}
                        </p>
                        <p>
                            <strong>类型: </strong>${JSON.stringify(error)}
                        </p>
                    </div>
                    <hr />
                    <br />
                </>
            );
            document.querySelector('#load-content').innerHTML = message;
            errorList.push(JSON.stringify(error));
            return false;
        };
    }, []);

    return (
        <>
            <div
                id='shade-global'
                data-umami-event='shade-global-click'
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
