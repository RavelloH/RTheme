'use client';

import { useState } from 'react';
import token from '@/utils/token';
import message from '@/utils/message';
import objectToForm from '@/utils/objectToForm';

export default function RenderProfileActions(props) {
    const { isOwner, isLogged, uid, followed, myUid } = props;
    const [isFollowing, setIsFollowing] = useState(
        followed && followed.some((item) => item.followingUserUid == myUid),
    );

    const handleFollow = (uid, action) => {
        fetch('/api/user/follow', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token.get(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: objectToForm({
                uid: uid,
                action: action,
            }),
        }).then((res) => {
            if (res.status == 200) {
                if (action === 'follow') {
                    message.success('关注成功');
                    setIsFollowing(true);
                } else {
                    message.success('取消关注成功');
                    setIsFollowing(false);
                }
            } else {
                message.error(action === 'follow' ? '关注失败' : '取消关注失败');
            }
        });
    };

    if (isOwner) {
        return (
            <a className='button no-effect' href='/user/update'>
                <span className='ri-user-settings-fill button'></span> 编辑
            </a>
        );
    }

    if (!isLogged) {
        return (
            <>
                <a className='button' href={'/account/signin?redirect=/user/?uid=' + uid}>
                    <span className='ri-user-heart-fill button'></span> 关注
                </a>
                {'     '}
                <a className='button' href={'/account/signin?redirect=/user/?uid=' + uid}>
                    <span className='ri-message-2-fill button'></span> 私信
                </a>
            </>
        );
    }

    return (
        <>
            {isFollowing ? (
                <a className='button no-effect' onClick={() => handleFollow(uid, 'unfollow')}>
                    <span className='ri-user-heart-fill button'></span> 取消关注
                </a>
            ) : (
                <a className='button no-effect' onClick={() => handleFollow(uid, 'follow')}>
                    <span className='ri-user-heart-fill button'></span> 关注
                </a>
            )}
            {'     '}
            <a className='button no-effect' href={'/message?uid=' + uid}>
                <span className='ri-message-2-fill button'></span> 私信
            </a>
        </>
    );
}
