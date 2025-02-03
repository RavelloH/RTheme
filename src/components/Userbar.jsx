/* eslint-disable @next/next/no-img-element */
'use client';

import global from '../assets/js/Global.jsx';
import { useEffect, useState } from 'react';
import token from '@/utils/token.js';
import message from '@/utils/message.js';
import { useBroadcast } from '@/store/useBoardcast.js';
import UserbarIcon from './UserbarIcon.jsx';
import ConfirmList from './ConfirmList.jsx';

function extractLastSegment(href) {
    const regex = /^(.*\/manage\/posts\/draft\/|.*\/posts\/)([^\/]+)$/;
    const match = href.match(regex);
    if (match && match[2]) {
        return match[2];
    }
    return null;
}

function editPost() {
    if (extractLastSegment(window.location.href)) {
        window.location.href = '/manage/posts/edit/' + extractLastSegment(window.location.href);
    } else {
        message.warn('未识别到有效的文档');
    }
}

function deletePost() {
    if (extractLastSegment(window.location.href)) {
        window.location.href = '/manage/posts/delete/' + extractLastSegment(window.location.href);
    } else {
        message.warn('未识别到有效的文档');
    }
}

function formatTimeDifference(timestamp) {
    const now = new Date();
    const futureDate = new Date(timestamp);

    let diffInSeconds = Math.floor((futureDate - now) / 1000);

    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    if (diffInSeconds < -60) {
        return -1;
    }
    if (diffInSeconds < 0) {
        return 0;
    }

    return (
        `${days ? days + '天' : ''}${hours ? hours + '小时' : ''}${
            minutes ? minutes + '分钟' : ''
        }` || '一分钟内'
    );
}

export default function Userbar() {
    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);
    const broadcast = useBroadcast((state) => state.broadcast);

    const [isLogin, setIsLogin] = useState(false);
    const [isUserbarOpen, setIsUserBarOpen] = useState(false);
    const [isTokenActive, setIsTokenActive] = useState(true);
    const [isWillingLogout, setIsWillingLogout] = useState(false);
    const [refreshTime, setRefreshTime] = useState(
        token.read('iat') * 1000 + 20 * 60 * 1000 - Date.now(),
    );

    useEffect(() => {
        const domLayoutUserBar = document.querySelector('#userbar');
        const domShadeGlobal = document.querySelector('#shade-global');

        const createTimer = () => {
            setTimeout(() => {
                if (!token.get()) return;
                token.refresh().then(() => {
                    setRefreshTime(token.read('iat') * 1000 + 20 * 60 * 1000 - Date.now());
                    createTimer();
                });
            }, refreshTime);
        };

        const openUserbar = (message) => {
            let timer;
            if (
                (message.action == 'toggleUserbar' && isUserbarOpen) ||
                message.action == 'openUserbar'
            ) {
                setIsUserBarOpen(true);
                if (token.get()) {
                    setIsLogin(true);

                    timer = setInterval(() => {
                        setRefreshTime(token.read('iat') * 1000 + 20 * 60 * 1000 - Date.now());
                    }, 1000);
                }
                domLayoutUserBar.classList.add('active');
                domShadeGlobal.classList.add('active');
            }
            if (
                (message.action == 'toggleUserbar' && !isUserbarOpen) ||
                message.action == 'closeUserbar'
            ) {
                setIsUserBarOpen(false);
                clearInterval(timer);
                domLayoutUserBar.classList.remove('active');
                domShadeGlobal.classList.remove('active');
            }
            if (message.action == 'tokenError') {
                setIsTokenActive(false);
            }
            if (message.action == 'logout') {
                setIsWillingLogout(true);
            }
        };

        registerBroadcast(openUserbar);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast, isUserbarOpen]);
    return (
        <>
            <div id='userbar-head'>
                <div id='userbar-title'>账号</div>
                <div
                    id='userbar-toggle'
                    onClick={() => {
                        broadcast({ action: 'closeUserbar' });
                    }}
                >
                    <span className='i ri-arrow-left-s-line'></span>
                </div>
            </div>
            <div id='userbar-context' className='overflow'>
                {isLogin ? (
                    <div id='user-info'>
                        <img id='user-avatar' src={token.read('avatar')} alt='User avatar' />
                        <div id='user-describe'>
                            <span id='user-name'>
                                {token.read('nickname') || token.read('username')}
                            </span>
                            <span id='user-bio'>{token.read('bio') || '未设置描述...'}</span>
                        </div>
                    </div>
                ) : (
                    <div id='user-info'>
                        <img id='user-avatar' src={'/user.jpg'} alt='User avatar' />
                        <div id='user-describe'>
                            <span id='user-name'>未登录</span>
                            <span id='user-bio'>未设置描述...</span>
                        </div>
                    </div>
                )}

                <div id='user-main'>
                    {isLogin ? (
                        <div id='user-actions' className='flex-list'>
                            <a className='no-effect' href='/manage/posts/create'>
                                <div>
                                    <span className='i ri-add-fill'></span> <br />
                                    <span>新建文稿</span>
                                </div>
                            </a>
                            <a className='no-effect' href='/manage/posts/draft'>
                                <div>
                                    <span className='i ri-draft-fill'></span> <br />
                                    <span>草稿箱</span>
                                </div>
                            </a>
                            <a className='no-effect' onClick={() => editPost()}>
                                <div>
                                    <span className='i ri-pencil-fill'></span> <br />
                                    <span>编辑文稿</span>
                                </div>
                            </a>
                            <a className='no-effect' onClick={() => deletePost()}>
                                <div>
                                    <span className='i ri-delete-bin-5-fill'></span> <br />
                                    <span>删除文稿</span>
                                </div>
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className='info-warning center'>
                                <span className='i_small ri-user-unfollow-line'></span>{' '}
                                尚未登录，部分功能受限
                                <br />
                                立刻 <a href='/account/signin'>登录</a> 或{' '}
                                <a href='/account/signup'>注册</a>
                            </div>
                            <div className='square-loader'>
                                <span></span>
                                <span></span>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div id='userbar-bottom'>
                <div id='user-state'>
                    {isLogin ? (
                        <div>
                            {isTokenActive ? (
                                <span className=''>
                                    <span className='ri-shield-check-fill'></span>
                                    &nbsp;当前TOKEN有效
                                </span>
                            ) : (
                                <span className='yellow'>
                                    <span className='ri-shield-keyhole-fill'></span>
                                    &nbsp;当前TOKEN失效,请重新登录
                                </span>
                            )}

                            <br />
                            {isTokenActive ? (
                                formatTimeDifference(Date.now() + refreshTime) < 1 ? (
                                    <span>
                                        <span className='ri-time-fill'></span> 正在重新刷新TOKEN
                                    </span>
                                ) : (
                                    <span>
                                        <span className='ri-time-fill'></span> 将于
                                        {formatTimeDifference(Date.now() + refreshTime)}
                                        后重新刷新TOKEN
                                    </span>
                                )
                            ) : (
                                <span className='yellow'>
                                    <span className='ri-time-fill'></span> 已终止主动刷新TOKEN
                                </span>
                            )}

                            <br />
                            <span>
                                <span className='ri-lock-password-fill'></span> TOKEN将于
                                {formatTimeDifference(1000 * token.read('exp'))}后失效
                            </span>
                        </div>
                    ) : (
                        <>
                            <span className=''>
                                <span className='ri-shield-check-fill'></span>
                                &nbsp;未登录
                            </span>
                            <br />
                            <span>
                                <span className='ri-time-fill'></span> 刷新进程离线
                            </span>
                            <br />
                            <span>
                                <span className='ri-lock-password-fill'></span>{' '}
                                当前未存储有效的TOKEN
                            </span>
                        </>
                    )}
                </div>
                <hr />
                <div className='flex-iconset'>
                    {isWillingLogout ? (
                        <ConfirmList
                            yesCallback={() => {
                                token.clear();
                                broadcast({
                                    action: 'closeUserbar',
                                });
                                window.location.reload();
                            }}
                            noCallback={() => {
                                setIsWillingLogout(false);
                            }}
                        />
                    ) : (
                        <UserbarIcon />
                    )}
                </div>
            </div>
        </>
    );
}
