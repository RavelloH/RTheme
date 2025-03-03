import prisma from '../api/_utils/prisma';
import config from '../../../config';

export default async function FriendPage() {
    const Friends = await prisma.user
        .findMany({
            where: {
                followed: {
                    some: {
                        followingUserUid: 1,
                    },
                },
            },
        })
        .then((friends) => {
            for (let i = friends.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [friends[i], friends[j]] = [friends[j], friends[i]];
            }
            return friends;
        });

    return (
        <>
            <div className='texts full overflow'>
                <br />
                <br />
                <h2 className='center'>
                    Friends / <wbr />
                    友链
                </h2>
                <br />
                <span className='virgule center'>Vast web , kindred spirits .</span>
                <br />
                <div id='friends-link-box'>
                    {Friends.map((item, index) => (
                        <div className='friends-link-item' key={item.index}>
                            <a
                                href={item.website}
                                className='no-effect'
                                target='_blank'
                                data-pjax-state=''
                                one-link-mark='yes'
                            >
                                <div className='friends-avatar'>
                                    <img
                                        src={item.avatar || '/user.jpg'}
                                        className='no-zoom loaded'
                                        loading='lazy'
                                        type='avatar'
                                        onload='imgLoad(this)'
                                        onerror='imgError(this)'
                                    />
                                </div>
                                <div className='friends-info'>
                                    <span className='friends-name one-line'>
                                        {item.nickname || item.username}
                                    </span>
                                    <span className='friends-bio one-line'>
                                        {item.bio || '未设置描述'}
                                    </span>
                                </div>
                            </a>
                        </div>
                    ))}
                </div>
                <br />
                <br />
                <hr />
                欢迎添加友链，请
                <a href='/account/signup' className='link'>
                    注册账号
                </a>
                后，完善你的签名、站点地址、头像、个人描述等信息后，直接使用站内信系统
                <a href='/message?uid=1' className='link'>
                    联系我
                </a>
                即可。
                <br />
                添加成功后，如果你想修改你的信息，直接在个人中心修改即可，即时生效。
                <br />
                我的站点信息如下:
                <pre>
                    <code>
                        <li>昵称: {config.author}</li>
                    </code>
                    <code>
                        <li>个人描述: {config.description}</li>
                    </code>
                    <code>
                        <li>头像: {config.siteURL + 'avatar.jpg'}</li>
                    </code>
                    <code>
                        <li>站点地址: {config.siteURL}</li>
                    </code>
                </pre>
                <i>*对于站长，你只需要关注用户即可将其显示在此页</i>
            </div>
        </>
    );
}
