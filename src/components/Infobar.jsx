'use client';

import { useEffect, useState } from 'react';
import Player from './Player';
import { useEvent } from '@/store/useEvent';
import getTime from '@/utils/getTime';
import switchElementContent from '@/utils/switchElement';
import { Base64 } from 'js-base64';
import { useBroadcast } from '@/store/useBroadcast';

import Info from './Info';
import Feed from './Feed';
import MusicSearch from './MusicSearch';
import Share from './Share';
import PostMenu from './PostMenu';

export default function Infobar() {
    const { broadcast } = useBroadcast();
    const [infoTitle, setInfoTitle] = useState('INFO');
    const [display, setDisplay] = useState(<Info />);
    const [href, setHref] = useState('');
    const { on, off, emit } = useEvent();
    const [time, setTime] = useState('00:00');
    useEffect(() => {
        const handleInfobar = (mode) => {
            document.querySelector('#infobar').classList.add('active');
            document.querySelector('#shade-global').classList.add('active');
            setTime(getTime('hh:mm'));
            const timer = setInterval(() => {
                if (document.querySelector('#infobar').classList.contains('active')) {
                    switchElementContent('#time', getTime('hh:mm'));
                } else {
                    clearInterval(timer);
                }
            }, 1000);
            setHref(Base64.encode(window.location.href));
            broadcast({
                action: 'closeSidebar',
            });
            document.querySelectorAll('.ready-to-show').forEach((item) => {
                item.style.opacity = 1;
            });

            switch (mode) {
                case 'info':
                    setInfoTitle('INFO');
                    setDisplay(<Info />);
                    break;
                case 'rss':
                    setInfoTitle('FEED');
                    setDisplay(<Feed />);
                    break;
                case 'music':
                    setInfoTitle('MUSIC');
                    setDisplay(<MusicSearch />);
                    break;
                case 'share':
                    setInfoTitle('SHARE');
                    setDisplay(<Share pathname={window.location.pathname} />);
                    break;
                case 'menu':
                    setInfoTitle('MENU');
                    setDisplay(<PostMenu />);
                    break;
                default:
                    break;
            }
        };
        const handleInfobarClose = () => {
            document.querySelector('#infobar').classList.remove('active');
            document.querySelector('#shade-global').classList.remove('active');
            setTimeout(() => {
                setDisplay(<></>);
            }, 500);
        };
        on('openInfobar', handleInfobar);
        on('closeInfobar', handleInfobarClose);
        return () => {
            off('openInfobar', handleInfobar);
            off('closeInfobar', handleInfobarClose);
        };
    }, [on, off]);
    return (
        <>
            <div id='infobar-header'>
                <div id='infobar-title'>{infoTitle}</div>
                <div
                    id='infobar-toggle'
                    onClick={() => {
                        emit('closeInfobar');
                    }}
                >
                    <span className='i ri-arrow-down-s-line'></span>
                </div>
            </div>
            <div id='infobar-context'>
                <div id='infobar-left'>{display}</div>
                <div id='infobar-right'>
                    <h2 id='time'>{time}</h2>
                    <hr />
                    <Player />
                    <div id='state-bar'></div>
                    <div id='href-id' className='barcode center'>
                        <hr />
                        {href}
                        <br />
                    </div>
                </div>
            </div>
        </>
    );
}
