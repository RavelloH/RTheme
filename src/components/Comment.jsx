/* eslint-disable @next/next/no-img-element */
'use client';

import '../assets/css/Comment.css';

import token from '@/utils/token';
import objectToForm from '@/utils/objectToForm';
import switchElementContent from '@/utils/switchElement';
import { useEffect } from 'react';
import message from '@/utils/message';

function timeParse(time) {
    const date = new Date(time);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date
        .getHours()
        .toString()
        .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
        .getSeconds()
        .toString()
        .padStart(2, '0')}`;
}

function commentInit() {
    // 确保只运行一次
    if (window.commentInitialized) {
        return;
    } else {
        window.commentInitialized = true;
        const commentHistory = document.createElement('div');
        commentHistory.id = 'comment-history';
        document.body.appendChild(commentHistory);
    }
    const commentTextarea = document.getElementById('comment-textarea');
    const commentButton = document.getElementById('comment-button');
    // 评论初始化
    if (token.get()) {
        commentTextarea.placeholder = '在此处输入评论...';
        commentButton.innerHTML = '<span>发送评论<span>';
        commentButton.classList.remove('block');
    } else {
        commentTextarea.placeholder = '请登录后发送评论';
        commentButton.innerHTML = '<span>登录后发送评论<span>';
    }

    // 评论字数统计
    commentTextarea.addEventListener('input', () => {
        const counter = document.getElementById('counter');
        counter.innerText = commentTextarea.value.length + '/1000';
    });

    // 防止评论字数超过1000
    commentTextarea.addEventListener('keydown', (e) => {
        if (commentTextarea.value.length >= 1000 && e.key !== 'Backspace') {
            e.preventDefault();
        }
    });

    // 超过950字后字数变红
    commentTextarea.addEventListener('input', () => {
        const counter = document.getElementById('counter');
        if (commentTextarea.value.length >= 950) {
            counter.style.color = 'red';
        } else {
            counter.style.color = '#c6c9ce';
        }
    });

    // 获取评论列表
    getComment();
}
function getComment() {
    // 提示加载中
    switchElementContent(
        '#comment-list',
        `<div class='square-loader'><span></span><span></span><span></span><span></span><span></span></div>`,
        0,
    );
    fetch(`/api/comment/read?postUid=${document.querySelector('.barcode.one-line').innerHTML}`, {
        method: 'GET',
    })
        .then((response) => response.json())
        .then((data) => {
            // TODO: LIKE DELETE...
            if (data) {
                if (data.length > 0) {
                    let resultList = [];
                    data.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
                    data.forEach((comment) => {
                        const commentItem = document.createElement('div');
                        commentItem.className = 'comment-item';
                        resultList.push(
                            <div className='comment-item' key={comment.id} name={comment.id}>
                                <div className='comment-item-header no-effect'>
                                    <a
                                        className='comment-item-header-info no-effect'
                                        href={`/user?uid=${comment.user.uid}`}>
                                        <img
                                            className='comment-item-avatar'
                                            src={comment.user.avatar || '/user.jpg'}
                                            alt='User Avatar'
                                        />
                                        <div>
                                            <span className='comment-item-nickname'>
                                                {comment.user.nickname}
                                            </span>
                                            <br />
                                            <span className='comment-item-username'>
                                                @{comment.user.username}
                                            </span>{' '}
                                            &nbsp;
                                            <span className='comment-item-time'>
                                                {timeParse(comment.createdAt)}
                                            </span>
                                            {/* {comment.updatedAt !== comment.createdAt && (
                                                <span className='comment-item-time'>
                                                    (修改于 {timeParse(comment.updatedAt)})
                                                </span>
                                            )} */}
                                        </div>
                                    </a>
                                    <div className='comment-item-actions'>
                                        {comment.user.uid === token.read('uid') ? (
                                            <>
                                                <a
                                                    onClick={() => {
                                                        deleteComment(comment.id);
                                                    }}
                                                    className='no-effect'>
                                                    <span className='i_mini ri-delete-bin-2-line'></span>
                                                </a>
                                                &nbsp;
                                            </>
                                        ) : null}
                                        {/* <a
                                            onClick={() => {
                                                likeComment(comment.id);
                                            }}
                                            className='no-effect'>
                                            <span className='i_mini ri-message-2-line'></span>
                                        </a>
                                        &nbsp; */}
                                        {comment.likeUserUid.includes(token.read('uid'))
                                            ? getLikeButton(true, comment, 0)
                                            : getLikeButton(false, comment, 0)}
                                    </div>
                                </div>
                                <div
                                    className='comment-item-content'
                                    dangerouslySetInnerHTML={{ __html: comment.content }}></div>
                            </div>,
                        );
                    });
                    switchElementContent('#comment-list', resultList, 0);
                } else {
                    const commentList = document.getElementById('comment-list');
                    commentList.innerHTML = '<p class="center">暂无评论</p>';
                }
            }
        })
        .catch((e) => {
            const commentList = document.getElementById('comment-list');
            commentList.innerHTML = '<p class="center">加载失败</p>';
            console.error(e);
        });
}

function deleteComment(id) {
    fetch('/api/comment/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${token.get()}`,
        },
        body: objectToForm({
            id: id,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message == '删除成功') {
                getComment();
                messsage.add(<a>删除成功</a>, 2000);
            } else {
                console.error(data.message);
            }
        })
        .catch((e) => {
            console.error(e);
        });
}

async function likeComment(id) {
    if (!token.get()) {
        message.warn('请登录后点赞');
        return;
    }
    return new Promise((resolve) => {
        fetch('/api/comment/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Bearer ${token.get()}`,
            },
            body: objectToForm({
                commentId: id,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.message === '操作成功') {
                    resolve(data);
                } else {
                    console.error(data.message);
                }
            })
            .catch((e) => {
                console.error(e);
            });
    });
}

function replyComment(id) {}

function sendComment() {
    // 防抖
    if (document.getElementById('comment-button').classList.contains('block')) {
        return;
    }

    // 创建评论
    if (!token.get()) {
        // 跳转登录
        window.location.href = '/account/signin?redirect=' + window.location.href;
    }
    const commentButton = document.getElementById('comment-button');
    switchElementContent(
        '#comment-button span',
        <span>
            <span className='circle-loader'></span>
        </span>,
    );
    commentButton.onclick = () => {};
    commentButton.classList.add('block');
    const commentTextarea = document.getElementById('comment-textarea');
    const comment = commentTextarea.value;

    fetch('/api/comment/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${token.get()}`,
        },
        body: objectToForm({
            postUid: document.querySelector('.barcode.one-line').innerHTML,
            content: comment,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === '操作成功') {
                commentTextarea.value = '';
                getComment();
                switchElementContent('#comment-button span', '发送成功，正在重新加载...');
                setTimeout(() => {
                    commentButton.classList.remove('block');
                    switchElementContent('#comment-button span', '发送评论');
                    commentButton.onclick = () => sendComment();
                }, 3000);
            } else {
                switchElementContent('#comment-button span', data.message);
                setTimeout(() => {
                    switchElementContent('#comment-button span', '发送评论');
                    commentButton.classList.remove('block');
                    commentButton.onclick = () => sendComment();
                }, 3000);
            }
        })
        .catch((e) => {
            console.error(e);
            switchElementContent('#comment-button span', e);
            setTimeout(() => {
                switchElementContent('#comment-button span', '发送评论');
                commentButton.classList.remove('block');
                commentButton.onclick = () => sendComment();
            }, 3000);
        });
}

function createCategory(arr) {
    const elements = arr.map((item, index) => <a key={`category-${index}`}>{item.name}</a>);
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [<span key={`separator-${index}`}>/</span>, element];
        }
        return element;
    });
    return <span className='class'>{joinedElements}</span>;
}

function createTag(arr) {
    const elements = arr.map((item, index) => <a key={`tag-${index}`}>{item.name}</a>);
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [element];
        }
        return element;
    });
    return (
        <p className='articles-tags'>
            <span className='ri-price-tag-3-line'></span>
            {joinedElements}
        </p>
    );
}

function getLikeButton(liked, comment, diff) {
    if (comment.likeNum) {
        comment.likeNum += diff;
    } else {
        comment.likeNum = comment.likeUserUid.length + diff;
    }
    if (liked) {
        return (
            <span id={`like-comment-${comment.id}`}>
                <a
                    onClick={() => {
                        if (!token.get()) {
                            message.warn('请登录后点赞');
                            return;
                        }
                        switchElementContent(
                            `#like-comment-${comment.id}`,
                            getLikeButton(false, comment, -1),
                        );
                        likeComment(comment.id);
                    }}
                    className='no-effect'>
                    <span className='i_mini ri-heart-3-fill'>{comment.likeNum}</span>
                </a>
                &nbsp;
            </span>
        );
    } else {
        return (
            <span id={`like-comment-${comment.id}`}>
                <a
                    onClick={() => {
                        if (!token.get()) {
                            message.warn('请登录后点赞');
                            return;
                        }
                        switchElementContent(
                            `#like-comment-${comment.id}`,
                            getLikeButton(true, comment, 1),
                        );
                        likeComment(comment.id);
                    }}
                    className='no-effect'>
                    <span className='i_mini ri-heart-3-line'>{comment.likeNum}</span>
                </a>
                &nbsp;
            </span>
        );
    }
}

export default function Comment() {
    useEffect(() => commentInit(), []);

    return (
        <div id='comment'>
            <p id='comment-title'>
                <span className='i_small ri-chat-4-line'></span> 评论
            </p>
            <div id='comment-input'>
                <textarea id='comment-textarea' placeholder='评论' />
                <div id='comment-info'>
                    <div id='textarea-actions'>
                        <a className='no-effect' onClick={() => {}}>
                            <span className='i ri-markdown-line'></span>
                        </a>{' '}
                        &nbsp;
                        <a className='no-effect' onClick={() => {}}>
                            <span className='i ri-image-line'></span>
                        </a>{' '}
                        &nbsp;
                        <a className='no-effect' onClick={() => {}}>
                            <span className='i ri-emotion-happy-line'></span>
                        </a>{' '}
                        &nbsp;
                        <a className='no-effect' onClick={() => getComment()}>
                            <span className='i ri-refresh-line'></span>
                        </a>
                    </div>

                    <div id='counter'>0/1000</div>
                </div>

                <div className='comment-actions'>
                    <a
                        id='comment-button'
                        className='big-button no-effect block'
                        onClick={() => sendComment()}>
                        <span>登录后发送评论</span>
                    </a>
                </div>
            </div>
            <div id='comment-list'></div>
        </div>
    );
}
