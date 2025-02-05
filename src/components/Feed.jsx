import config from '../../config';
import notice from '@/utils/notice';

export default function Feed() {
    return (
        <>
            <div className='full' id='feed-list'>
                <a href={config.siteURL + 'feed.xml'} className='no-effect' target='_blank'>
                    <div>
                        <span className='i ri-rss-fill'></span> <span>RSS</span>
                    </div>
                </a>
                <a href={config.siteURL + 'sitemap.xml'} className='no-effect' target='_blank'>
                    <div>
                        <span className='i ri-road-map-fill'></span> <span>Sitemap</span>
                    </div>
                </a>
                <a
                    onClick={() => {
                        if (!notice.check()) {
                            notice.request();
                        }
                    }}
                    className='no-effect'
                    target='_blank'
                >
                    <div>
                        <span className='i ri-notification-2-fill'></span> <span>启用通知</span>
                    </div>
                </a>
            </div>
            <div
                className='center'
                id='mail-feed'
                onClick={() => alert('哈哈，我还没写这个功能，你找到彩蛋了')}
            >
                <span className='i ri-mail-add-fill'></span> <span>邮箱订阅</span>
            </div>
            <hr />
            <h2>订阅</h2>
            <p>
                在上方选择相应的订阅格式获取链接，订阅将在新内容发布后自动同步。
                <br />
                或者，也可以在登录后使用邮箱订阅。订阅后，有更新时会向绑定的邮箱发送通知。
            </p>
        </>
    );
}
