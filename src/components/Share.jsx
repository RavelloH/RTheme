import { Base64 } from 'js-base64';
import config from '../../config';
import QR from './QR';
import '@/assets/css/Share.css';

export default function Share({ pathname }) {
    function copy(text, button) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        if (feedbackElement !== null) {
            switchElementContent(feedbackElement, <span className='i ri-file-copy-2-fill'></span>);
        }
    }

    const shareUrl = config.siteURL.slice(0, -1) + pathname;

    const shareLinks = [
        // 国际主流平台
        {
            platform: 'Twitter',
            icon: 'ri-twitter-x-fill',
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Facebook',
            icon: 'ri-facebook-fill',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'LinkedIn',
            icon: 'ri-linkedin-fill',
            url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
                shareUrl,
            )}`,
        },
        {
            platform: 'Reddit',
            icon: 'ri-reddit-fill',
            url: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Telegram',
            icon: 'ri-telegram-fill',
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'WhatsApp',
            icon: 'ri-whatsapp-fill',
            url: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Pinterest',
            icon: 'ri-pinterest-fill',
            url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Tumblr',
            icon: 'ri-tumblr-fill',
            url: `https://www.tumblr.com/widgets/share/tool?posttype=link&canonicalUrl=${encodeURIComponent(
                shareUrl,
            )}`,
        },
        // 即时通讯平台
        {
            platform: 'Skype',
            icon: 'ri-skype-fill',
            url: `skype:?chat&topic=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Viber',
            icon: 'ri-chat-3-fill',
            url: `viber://forward?text=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Teams',
            icon: 'ri-microsoft-fill',
            url: `https://teams.microsoft.com/share?url=${encodeURIComponent(shareUrl)}`,
        },
        // 中国平台
        {
            platform: 'WeChat',
            icon: 'ri-wechat-fill',
            url: `https://weixin.qq.com`,
        },
        {
            platform: 'Weibo',
            icon: 'ri-weibo-fill',
            url: `http://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'QQ',
            icon: 'ri-qq-fill',
            url: `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(
                shareUrl,
            )}`,
        },
        {
            platform: 'Douban',
            icon: 'ri-douban-fill',
            url: `https://www.douban.com/share/service?href=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'TikTok',
            icon: 'ri-tiktok-fill',
            url: `https://www.tiktok.com`,
        },
        {
            platform: 'Zhihu',
            icon: 'ri-zhihu-fill',
            url: `https://www.zhihu.com`,
        },
        {
            platform: 'Bilibili',
            icon: 'ri-bilibili-fill',
            url: `https://www.bilibili.com`,
        },
        // 亚洲其他平台
        {
            platform: 'Line',
            icon: 'ri-line-fill',
            url: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'KakaoTalk',
            icon: 'ri-kakao-talk-fill',
            url: `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
        },
        // 专业/技术平台
        {
            platform: 'GitHub',
            icon: 'ri-github-fill',
            url: `https://github.com`,
        },
        {
            platform: 'Discord',
            icon: 'ri-discord-fill',
            url: `https://discord.com`,
        },
        {
            platform: 'Slack',
            icon: 'ri-slack-fill',
            url: `https://slack.com`,
        },
        {
            platform: 'Mastodon',
            icon: 'ri-mastodon-fill',
            url: 'https://mastodon.social',
        },
        {
            platform: 'Stack Overflow',
            icon: 'ri-stack-overflow-fill',
            url: `https://stackoverflow.com`,
        },
        {
            platform: 'Hashnode',
            icon: 'ri-hashtag',
            url: `https://hashnode.com`,
        },
        // 俄罗斯平台
        {
            platform: 'VK',
            icon: 'ri-vk-fill',
            url: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`,
        },
        // 书签服务
        {
            platform: 'Instapaper',
            icon: 'ri-file-list-fill',
            url: `https://www.instapaper.com/hello2?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Feedly',
            icon: 'ri-rss-fill',
            url: `https://feedly.com/i/discover`,
        },
        {
            platform: 'Evernote',
            icon: 'ri-evernote-fill',
            url: `https://www.evernote.com/clip.action?url=${encodeURIComponent(shareUrl)}`,
        },
        // 电子邮件分享
        {
            platform: 'Email',
            icon: 'ri-mail-fill',
            url: `mailto:?body=${encodeURIComponent(shareUrl)}`,
        },
        // 媒体分享平台
        {
            platform: 'YouTube',
            icon: 'ri-youtube-fill',
            url: `https://www.youtube.com`,
        },
        {
            platform: 'Instagram',
            icon: 'ri-instagram-fill',
            url: `https://www.instagram.com`,
        },
        {
            platform: 'Flickr',
            icon: 'ri-flickr-fill',
            url: `https://www.flickr.com/sharing/share?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Medium',
            icon: 'ri-medium-fill',
            url: `https://medium.com`,
        },
        // 商务平台
        {
            platform: 'Notion',
            icon: 'ri-notion-fill',
            url: `https://www.notion.so`,
        },
        // 其他地区平台
        {
            platform: 'Odnoklassniki',
            icon: 'ri-admin-fill',
            url: `https://connect.ok.ru/offer?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Xing',
            icon: 'ri-xing-fill',
            url: `https://www.xing.com/spi/shares/new?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            platform: 'Hacker News',
            icon: 'ri-fire-fill',
            url: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(shareUrl)}`,
        },
        // 开发者平台
        {
            platform: 'CodePen',
            icon: 'ri-codepen-fill',
            url: `https://codepen.io`,
        },
        {
            platform: 'GitLab',
            icon: 'ri-gitlab-fill',
            url: `https://gitlab.com`,
        },
        {
            platform: 'npm',
            icon: 'ri-npmjs-fill',
            url: `https://www.npmjs.com`,
        },

        // 设计师平台
        {
            platform: 'Dribbble',
            icon: 'ri-dribbble-fill',
            url: `https://dribbble.com`,
        },
        {
            platform: 'Behance',
            icon: 'ri-behance-fill',
            url: `https://www.behance.net`,
        },
        {
            platform: 'ArtStation',
            icon: 'ri-artboard-fill',
            url: `https://www.artstation.com`,
        },

        // 写作平台
        {
            platform: 'Substack',
            icon: 'ri-newspaper-fill',
            url: `https://substack.com`,
        },
        {
            platform: 'WordPress',
            icon: 'ri-wordpress-fill',
            url: `https://wordpress.com`,
        },

        // 加密社区
        {
            platform: 'OpenSea',
            icon: 'ri-ship-fill',
            url: `https://opensea.io`,
        },
        {
            platform: 'MetaMask',
            icon: 'ri-firefox-fill',
            url: `https://metamask.io`,
        },

        // 音乐平台
        {
            platform: 'Spotify',
            icon: 'ri-spotify-fill',
            url: `https://open.spotify.com`,
        },
        {
            platform: 'SoundCloud',
            icon: 'ri-soundcloud-fill',
            url: `https://soundcloud.com`,
        },
        {
            platform: 'Apple Music',
            icon: 'ri-apple-fill',
            url: `https://music.apple.com`,
        },

        // 游戏平台
        {
            platform: 'Steam',
            icon: 'ri-steam-fill',
            url: `https://store.steampowered.com`,
        },
        {
            platform: 'Twitch',
            icon: 'ri-twitch-fill',
            url: `https://www.twitch.tv`,
        },
        {
            platform: 'Discord',
            icon: 'ri-discord-fill',
            url: `https://discord.com`,
        },

        // 生产力工具
        {
            platform: 'Trello',
            icon: 'ri-trello-fill',
            url: `https://trello.com`,
        },
        {
            platform: 'Asana',
            icon: 'ri-task-fill',
            url: `https://asana.com`,
        },
        {
            platform: 'ClickUp',
            icon: 'ri-check-double-fill',
            url: `https://clickup.com`,
        },

        // 学习平台
        {
            platform: 'Coursera',
            icon: 'ri-graduation-cap-fill',
            url: `https://www.coursera.org`,
        },
        {
            platform: 'Udemy',
            icon: 'ri-book-fill',
            url: `https://www.udemy.com`,
        },
        {
            platform: 'edX',
            icon: 'ri-school-fill',
            url: `https://www.edx.org`,
        },
        // 通用分享方式
        {
            platform: 'Copy Link',
            icon: 'ri-links-fill',
            url: '#',
            onClick: (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(shareUrl);
                // 可以添加复制成功的提示
            },
        },
    ];

    return (
        <>
            <h5>
                <strong>当前链接:</strong>
            </h5>
            <div id='share-local' className='share-area'>
                <div className='share-input' id='input-area-local' contentEditable='true'>
                    {config.siteURL.slice(0, -1) + pathname}
                </div>
                <div className='copy-button' id='copy-button-local'>
                    <span>
                        <span
                            onClick={() =>
                                copy(
                                    this.parentNode.parentNode.parentNode.firstElementChild
                                        .innerHTML,
                                    this.parentNode,
                                )
                            }
                            className='i ri-file-copy-2-fill'
                        ></span>
                    </span>
                </div>
            </div>
            <div id='share-local' className='share-area'>
                <div className='share-input' id='input-area-short' contentEditable='true'>
                    {config.siteURL.slice(0, -1) + '?u=' + Base64.encode(pathname)}
                </div>
                <div className='copy-button' id='copy-button-short'>
                    <span>
                        <span
                            onClick={() =>
                                copy(
                                    this.parentNode.parentNode.parentNode.firstElementChild
                                        .innerHTML,
                                    this.parentNode,
                                )
                            }
                            className='i ri-file-copy-2-fill'
                        ></span>
                    </span>
                </div>
            </div>
            <div className='social-share'>
                <div className='share-buttons'>
                    {shareLinks.map(({ platform, icon, url, onClick }) => (
                        <a
                            key={platform}
                            href={url}
                            target='_blank'
                            rel='noopener noreferrer'
                            title={`分享到${platform}`}
                            className='share-button no-effect'
                            data-umami-event={`share-${platform}`}
                            onClick={onClick}
                        >
                            <i className={`i ${icon}`}></i>
                        </a>
                    ))}
                </div>
            </div>
            <hr />
            <div className='share-flex-container'>
                <div className='qr-container'>
                    <QR
                        url={config.siteURL.slice(0, -1) + '?from=qr&u=' + Base64.encode(pathname)}
                    />
                </div>
            </div>
            <hr />
            <img
                src={`${config.screenshotApi}?url=${
                    config.siteURL.slice(0, -1) + pathname
                }&viewport=1600x800&waitUntil=networkidle0`}
                alt='site screenshot'
                width={1600}
                height={800}
                style={{
                    maxWidth: '100%',
                    height: 'auto',
                    aspectRatio: '2/1',
                }}
            />
        </>
    );
}
