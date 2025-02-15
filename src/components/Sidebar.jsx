'use client';

import config from '../../config';
import Menu from './Menu';
import Copyright from './Copyright';
import Sideicon from './Sideicon';
import Virgule from './Virgule';
import { useBroadcast } from '@/store/useBroadcast';
import { useEffect, useState, useRef } from 'react';
import { getRealTimeVisitors } from '@/utils/analysis';
import messager from '@/utils/message';

export default function Sidebar() {
    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);
    const broadcast = useBroadcast((state) => state.broadcast);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [defaultMessage, setDefaultMessage] = useState(messager.original);
    const isSidebarOpenRef = useRef(isSidebarOpen);

    useEffect(() => {
        isSidebarOpenRef.current = isSidebarOpen;
    }, [isSidebarOpen]);

    useEffect(() => {
        const handleSidebar = (message) => {
            if (
                (message.action === 'toggleSidebar' && !isSidebarOpenRef.current) ||
                message.action === 'openSidebar'
            ) {
                setIsSidebarOpen(true);
                document.querySelector('#toggle').classList.add('active');
                document.querySelector('body').classList.add('active');
                document.querySelector('#shade-context').classList.add('active');
                setDefaultMessage(messager.realTime);
                getRealTimeVisitors().then((res) => {
                    if (isSidebarOpenRef.current) {
                        messager.switch(
                            <a>
                                <strong>在线访客: {res} </strong>&nbsp;
                                <span className='i ri-earth-line'></span>
                            </a>,
                        );
                    }
                });
            }
            if (
                (message.action == 'toggleSidebar' && isSidebarOpenRef.current) ||
                message.action == 'closeSidebar'
            ) {
                setIsSidebarOpen(false);
                document.querySelector('#toggle').classList.remove('active');
                document.querySelector('body').classList.remove('active');
                document.querySelector('#shade-context').classList.remove('active');
                messager.switch(defaultMessage);
            }
        };
        registerBroadcast(handleSidebar);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast, broadcast, isSidebarOpen, defaultMessage]);

    return (
        <>
            <div id='sidebar-top'>
                <div id='sideinfo'>
                    <h3>{config.author}&apos;s</h3>
                    <h2>BLOG</h2>
                    <a
                        className='icons'
                        href={'mailto:' + config.mail}
                        id='email'
                        data-umami-event='mail'
                    >
                        {' '}
                        <span className='i ri-mail-add-fill'></span> &nbsp;{' '}
                        <span>
                            <Virgule text={config.mail} />
                        </span>{' '}
                    </a>
                    <hr />
                </div>
            </div>
            <div id='sidebar-mid'>
                <menu id='sidebar-menu'>
                    <ul>
                        <Menu />
                    </ul>
                </menu>
            </div>
            <div id='sidebar-bottom'>
                <hr />
                <div id='side-info'>
                    <Copyright />
                </div>
                <div className='flex-iconset'>
                    <Sideicon />
                </div>
            </div>
        </>
    );
}
