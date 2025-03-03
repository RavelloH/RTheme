/* eslint-disable @next/next/no-img-element */

import { cookies } from 'next/headers';
import formatDateWithTimeZone from '@/utils/time';
import prisma from '../api/_utils/prisma';
import tokenServer from '../api/_utils/token';
import RenderProfileActions from '@/components/ProfileActions';

function getMinutesFromNow(timestamp) {
    const now = new Date().getTime();
    const diff = now - timestamp;
    const minutes = Math.round(diff / (1000 * 60));
    return minutes;
}

function timeAgo(timestamp) {
    if (!timestamp) return '很久之前';
    const units = {
        年: 365 * 24 * 60 * 60 * 1000,
        个月: 30 * 24 * 60 * 60 * 1000,
        天: 24 * 60 * 60 * 1000,
        小时: 60 * 60 * 1000,
        分钟: 60 * 1000,
        秒: 1000,
    };

    const diff = new Date().getTime() - timestamp;
    const unitNames = Object.keys(units);

    for (const unit of unitNames) {
        const num = Math.round(diff / units[unit]);
        if (num > 0) {
            return `${num}${unit}前`;
        }
    }

    return '刚刚';
}

function dynamic(userinfo) {
    let dynamicList = [];
    userinfo.post.forEach((post) =>
        dynamicList.push({
            time: post.createdAt,
            link: '/posts/' + post.name,
            message: (
                <div>
                    <p style={{ maxWidth: '100%' }}>
                        <span className='ri-time-fill'></span>{' '}
                        <span>{formatDateWithTimeZone(post.createdAt, -8)}</span> &gt;
                        发布了新文稿：<a href={'/posts/' + post.name}>{post.title}</a>
                    </p>
                    <hr className='light' />
                </div>
            ),
        }),
    );
    userinfo.comment.forEach((comment) => {
        dynamicList.push({
            time: comment.createdAt,
            link: '#',
            message: (
                <div>
                    <p style={{ maxWidth: '100%' }}>
                        <span className='ri-time-fill'></span>{' '}
                        <span>{formatDateWithTimeZone(comment.createdAt, -8)}</span> &gt;
                        发表了评论：{comment.content.slice(0, 30)}...
                    </p>
                    <hr className='light' />
                </div>
            ),
        });
    });
    userinfo.following.forEach((following) => {
        dynamicList.push({
            time: following.startAt,
            link: '/user?uid=' + following.uid,
            message: (
                <div>
                    <p style={{ maxWidth: '100%' }}>
                        <span className='ri-time-fill'></span>{' '}
                        <span>{formatDateWithTimeZone(following.startAt, -8)}</span> &gt;
                        关注了用户：
                        <a href={'/user?uid=' + following.followedUserUid}>
                            {following.followedUser.nickname}
                        </a>
                    </p>
                    <hr className='light' />
                </div>
            ),
        });
    });
    userinfo.followed.forEach((followed) => {
        dynamicList.push({
            time: followed.startAt,
            link: '/user?uid=' + followed.uid,
            message: (
                <div>
                    <p style={{ maxWidth: '100%' }}>
                        <span className='ri-time-fill'></span>{' '}
                        <span>{formatDateWithTimeZone(followed.startAt, -8)}</span> &gt; 被用户：
                        <a href={'/user?uid=' + followed.followingUserUid}>{followed.followingUser.nickname}</a> 关注
                    </p>
                    <hr className='light' />
                </div>
            ),
        });
    });
    dynamicList.sort((a, b) => new Date(b.time) - new Date(a.time));
    let resultList = [];
    dynamicList.forEach((item) =>
        resultList.push(<div key={resultList.length + 1}>{item.message}</div>),
    );
    if (resultList.length == 0) {
        resultList.push(
            <div className='texts full center'>
                <br />
                <br />
                <span className='virgule'>此用户暂无动态</span>
            </div>,
        );
    }
    return resultList;
}

function renderUserInfo(userinfo, getMinutesFromNow, timeAgo) {
    return (
        <>
            <img
                src={userinfo.avatar || '/user.jpg'}
                alt='avatar'
                width={100}
                height={100}
                id='user-avatar'
            />
            <div id='user-describe'>
                <span id='user-name'>
                    {userinfo.nickname}
                    <span style={{ color: 'gray', fontSize: '0.8em' }}> @{userinfo.username}</span>
                </span>
                <span id='user-bio'>
                    {userinfo.bio || '未设置描述...'}
                    {' \\ '}
                    <span>
                        {getMinutesFromNow(userinfo.lastUseAt) < 20
                            ? '当前在线'
                            : '最近于' + timeAgo(userinfo.lastUseAt) + '在线'}{' '}
                        \ 创建于
                        {Math.floor((Date.now() - userinfo.createdAt) / 1000 / 60 / 60 / 24)}
                        天前
                    </span>
                </span>
            </div>
        </>
    );
}

export default async function User({ searchParams }) {
    const { uid } = searchParams;
    const cookieStore = cookies().get('usertoken');

    if (!cookieStore && uid) {
        const userinfo = await prisma.user.findUnique({
            where: { uid: parseInt(uid) },
            include: {
                password: false,
                email: false,
                birth: false,
                country: false,
                updatedAt: false,
                post: {
                    include: {
                        content: false,
                        title: false,
                        name: false,
                    },
                },
                comment: true,
                note: true,
                followed: true,
                following: true,
            },
        });
        await prisma.$disconnect();

        if (!userinfo)
            return (
                <>
                    <div className='texts full overflow center'>
                        <h3 className='center'>此用户不存在</h3>
                    </div>
                </>
            );
        return (
            <div className='full overflow' style={{ height: '100%' }}>
                {' '}
                <br />
                <br />
                <br />
                <div
                    className='full'
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        justifyContent: 'space-between',
                    }}>
                    <div className='userInfo'>
                        <div id='user-info'>
                            {renderUserInfo(userinfo, getMinutesFromNow, timeAgo)}
                        </div>
                    </div>

                    <div className='userBehavior'>
                        <RenderProfileActions isOwner={false} isLogged={false} uid={uid} />
                    </div>
                </div>
                <hr />
                <div className='texts full'>
                    <div className='full center flex-list'>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.post.length}</span>{' '}
                                <span>文稿</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.note.length}</span>{' '}
                                <span>手记</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.comment.length}</span>{' '}
                                <span>评论</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.following.length}</span>{' '}
                                <span>关注</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.followed.length}</span>{' '}
                                <span>关注者</span>
                            </div>
                        </a>
                        <br />
                        <br />
                        <br />
                        <br />
                        <div></div>
                    </div>
                    <br />
                    <br />

                    <div className='center virgule'>
                        <span className='ri-alert-line'></span> 尚未登录，请
                        <a href={`/account/signin?redirect=/user%3fuid=${uid}`}>登录</a>后查看更多
                    </div>
                </div>
            </div>
        );
    }

    let user;

    try {
        user = await tokenServer.verify(cookieStore.value);
    } catch (e) {
        console.error(e);
        return (
            <>
                <div className='texts full center'>
                    <h3 className='center'>用户凭据失效，请重新登录</h3>
                </div>
            </>
        );
    }

    if (user) {
        const userinfo = await prisma.user.findUnique({
            where: { uid: parseInt(uid) || tokenServer.verify(cookieStore.value).uid },
            include: {
                password: false,
                post: {
                    where: {
                        published: true,
                    },
                    include: {
                        content: false,
                    },
                },
                comment: true,
                note: true,
                followed: {
                    include: {
                        followingUser: {
                            select: {
                                nickname: true,
                                uid: true,
                            },
                        },
                    },
                },
                following: {
                    include: {
                        followedUser: {
                            select: {
                                nickname: true,
                                uid: true,
                            }
                        },
                    },
                },
            },
        });
        const isOwner = user.uid == uid || tokenServer.verify(cookieStore.value).uid == uid || !uid;
        if (isOwner) {
            // 可编辑
            return (
                <div className='full overflow' style={{ height: '100%' }}>
                    {' '}
                    <br />
                    <br />
                    <br />
                    <div
                        className='full'
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'nowrap',
                            justifyContent: 'space-between',
                        }}>
                        <div className='userInfo'>
                            <div id='user-info'>
                                {renderUserInfo(userinfo, getMinutesFromNow, timeAgo)}
                            </div>
                        </div>

                        <div className='userBehavior'>
                            <RenderProfileActions isOwner={isOwner} isLogged={true} uid={uid} />
                        </div>
                    </div>
                    <hr />
                    <div className='texts full'>
                        <div className='full center flex-list'>
                            <a className='no-effect'>
                                <div>
                                    <span className='virgule'>{userinfo.post.length}</span>{' '}
                                    <span>文稿</span>
                                </div>
                            </a>
                            <a className='no-effect'>
                                <div>
                                    <span className='virgule'>{userinfo.note.length}</span>{' '}
                                    <span>手记</span>
                                </div>
                            </a>
                            <a className='no-effect'>
                                <div>
                                    <span className='virgule'>{userinfo.comment.length}</span>{' '}
                                    <span>评论</span>
                                </div>
                            </a>
                            <a className='no-effect'>
                                <div>
                                    <span className='virgule'>{userinfo.following.length}</span>{' '}
                                    <span>关注</span>
                                </div>
                            </a>
                            <a className='no-effect'>
                                <div>
                                    <span className='virgule'>{userinfo.followed.length}</span>{' '}
                                    <span>关注者</span>
                                </div>
                            </a>
                        </div>
                        <br />
                        <br />
                        <br />
                        <h4 className='center'>- 动态 -</h4>
                        <div className='full' style={{ width: '70%', margin: '0 auto' }}>
                            {dynamic(userinfo)}
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className='full overflow' style={{ height: '100%' }}>
                {' '}
                <br />
                <br />
                <br />
                <div
                    className='full'
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        justifyContent: 'space-between',
                    }}>
                    <div className='userInfo'>
                        <div id='user-info'>
                            {renderUserInfo(
                                userinfo,
                                getMinutesFromNow,
                                timeAgo,
                                userinfo.followed,
                            )}
                        </div>
                    </div>

                    <div className='userBehavior'>
                        <RenderProfileActions
                            isOwner={isOwner}
                            isLogged={true}
                            uid={uid}
                            followed={userinfo.followed}
                            myUid={user.uid}
                        />
                    </div>
                </div>
                <hr />
                <div className='texts full'>
                    <div className='full center flex-list'>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.post.length}</span>{' '}
                                <span>文稿</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.note.length}</span>{' '}
                                <span>手记</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.comment.length}</span>{' '}
                                <span>评论</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.following.length}</span>{' '}
                                <span>关注</span>
                            </div>
                        </a>
                        <a className='no-effect'>
                            <div>
                                <span className='virgule'>{userinfo.followed.length}</span>{' '}
                                <span>关注者</span>
                            </div>
                        </a>
                    </div>
                    <br />
                    <br />
                    <br />
                    <h4 className='center'>- 动态 -</h4>
                    <div className='full' style={{ width: '70%', margin: '0 auto' }}>
                        {dynamic(userinfo)}
                    </div>
                </div>
            </div>
        );
    }
}
