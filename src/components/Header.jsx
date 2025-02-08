/* eslint-disable @next/next/no-img-element */
'use client';

import Nav from './Nav';
import config from '../../config';
import Image from 'next/image';
import { useBroadcast } from '@/store/useBroadcast';

export default function Header() {
    const broadcast = useBroadcast((state) => state.broadcast);

    return (
        <header>
            <div
                id='logo'
                className='loading'
                style={{ '--i': 1 }}
                onClick={() => broadcast({ action: 'openUserbar' })}
            >
                <a href='#userbar'>
                    <img
                        id='avatar'
                        className='no-zoom'
                        src='/avatar.jpg'
                        alt='avatar'
                        placeholder='blur'
                        data-umami-event='header-avatar'
                    />
                    {config.logo && (
                        <Image
                            id='avatarname'
                            className='no-zoom'
                            src={config.logo.src}
                            alt={config.logo.alt}
                            width={config.logo.width}
                            height={config.logo.height}
                        />
                    )}
                </a>
            </div>
            <div id='header-side'>
                <div id='navs'>
                    <Nav />
                </div>
                <div
                    id='toggle'
                    className='loading'
                    style={{ '--i': 0 }}
                    data-umami-event='header-toggler'
                    onClick={() => broadcast({ action: 'toggleSidebar' })}
                ></div>
            </div>
        </header>
    );
}
