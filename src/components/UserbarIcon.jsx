'use client';

import { useBroadcast } from '@/store/useBroadcast';
import loadURL from '@/utils/loadURL';

export default function UserbarIcon() {
    const broadcast = useBroadcast((state) => state.broadcast);
    return (
        <ul>
            <li>
                <a href={'/user'} id='icon-account' aria-label='account'>
                    <span className='i ri-account-circle-line'></span>
                </a>
            </li>
            <li>
                <a href='/user/update' id='icon-account-setting' aria-label='account setting'>
                    <span className='i ri-user-settings-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#message-setting'
                    id='icon-message-setting'
                    data-umami-event='userbar-message-setting'
                    onClick={() => {
                        broadcast({ action: 'openMessageSetting' });
                    }}
                    aria-label='message-setting'
                >
                    <span className='i ri-mail-settings-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#message'
                    id='icon-message'
                    onClick={() => {
                        loadURL('/message');
                    }}
                    aria-label='message'
                >
                    <span className='i ri-message-2-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#'
                    id='icon-logout'
                    data-umami-event='userbar-logout'
                    onClick={() => {
                        broadcast({
                            action: 'logout',
                        });
                    }}
                    aria-label='logout'
                >
                    <span className='i ri-logout-box-r-line'></span>
                </a>
            </li>
        </ul>
    );
}
