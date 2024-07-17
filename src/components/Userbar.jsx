'use client';

import userImage from '../assets/images/user.jpg';
import global from '../assets/js/Global.jsx';
import Image from 'next/image';

export default function Userbar() {
    return (
        <>
            <div id='userbar-head'>
                <div id='userbar-title'>账号</div>
                <div
                    id='userbar-toggle'
                    onClick={() => {
                        global.toggleLayoutUserbar();
                    }}
                >
                    <span className='i ri-arrow-left-s-line'></span>
                </div>
            </div>
            <div id='userbar-context'>
                <div id='user-info'>
                    <Image id='user-avatar' src={userImage} alt='User avatar' />
                    <div id='user-describe'>
                        <span id='user-name'>未登录</span>
                        <span id='user-bio'>未设置描述...</span>
                    </div>
                </div>
                <div id='user-main'>
                    <div className='square-loader'>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
            <div id='userbar-bottom'>
                <hr />
                <div className='flex-iconset'>
                    <ul>
                        <li>
                            <a
                                href='#account'
                                id='icon-account'
                                onClick={() => {
                                    global.openUserbar('account');
                                    return false;
                                }}
                                aria-label='account'
                            >
                                <span className='i ri-account-circle-line'></span>
                            </a>
                        </li>
                        <li>
                            <a
                                href='#account-setting'
                                id='icon-account-setting'
                                onClick={() => {
                                    global.openUserbar('setting');
                                    return false;
                                }}
                                aria-label='account setting'
                            >
                                <span className='i ri-user-settings-line'></span>
                            </a>
                        </li>
                        <li>
                            <a
                                href='#message-setting'
                                id='icon-message-setting'
                                onClick={() => {
                                    global.openUserbar('message-setting');
                                    return false;
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
                                    global.openUserbar('message');
                                    return false;
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
                                onClick={() => {
                                    global.openUserbar('logout');
                                    return false;
                                }}
                                aria-label='logout'
                            >
                                <span className='i ri-logout-box-r-line'></span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </>
    );
}
