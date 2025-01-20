/* eslint-disable @next/next/no-img-element */
'use client';

import global from '../assets/js/Global.jsx';
import { useEffect } from 'react';
import token from '@/utils/token.js';
import message from '@/utils/message.js';

function loadUserbar() {
    if (token.get()) {
        document.querySelector('#userbar-context #user-name').innerText =
            token.read('nickname') || token.read('username');
        document.querySelector('#userbar-context #user-bio').innerText =
            token.read('bio') || '未设置描述...';
        document.querySelector('#userbar-context #user-avatar').src = token.read('avatar');
    }
}

function logout() {
    token.clear();
    global.toggleLayoutUserbar();
    window.location.reload();
}

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

export default function Userbar() {
    useEffect(() => {
        loadUserbar();
    });
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
            <div id='userbar-context' className='overflow'>
                <div id='user-info'>
                    <img id='user-avatar' src={'/user.jpg'} alt='User avatar' />
                    <div id='user-describe'>
                        <span id='user-name'>未登录</span>
                        <span id='user-bio'>未设置描述...</span>
                    </div>
                </div>
                <div id='user-main'>
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
                </div>
            </div>
            <div id='userbar-bottom'>
                <div id='user-state'>
                    <div className='square-loader'>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <hr />
                <div className='flex-iconset'>
                    <ul>
                        <li>
                            <a href={'/user'} id='icon-account' aria-label='account'>
                                <span className='i ri-account-circle-line'></span>
                            </a>
                        </li>
                        <li>
                            <a
                                href='/user/update'
                                id='icon-account-setting'
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
                                    logout();
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
