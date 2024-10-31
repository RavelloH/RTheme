// RTheme v3 - i18n.js(语言包)
import cookie from './lib/cookie.js';
import config from '../../../config.js';
import global from './Global.jsx';
import Image from 'next/image.js';

import FooterIcon from '../../components/FooterIcon.jsx';

const collator = new Intl.Collator('zh-Hans-CN', {
    numeric: true,
});

const structurePrograssBar = (
    <ul>
        <li>
            <div id='progress-container'>
                <div id='progress'></div>
            </div>
        </li>
    </ul>
);

const originIconsLeftContext = (
    <nav>
        <FooterIcon />
    </nav>
);
const structureErrorViewmap = (
    <>
        <div className='texts'>
            <h2>Error...</h2>
            <h3>Page load failed.</h3>
            <span className='virgule'>请求的页面未成功加载。</span>
            <span>
                {' '}
                <span className='i_small ri-error-warning-line'></span> 服务器无法正常返回资源
            </span>
            <br />
            <div className='button-list'>
                <a className='button' onClick={() => global.pjaxLoad('/')}>
                    回退到上个页面
                </a>{' '}
                <a className='button' onClick={() => global.checklink('\\')}>
                    尝试自动解决
                </a>
            </div>
        </div>
        <div>
            <span className='i_large ri-alert-line'></span>
        </div>
    </>
);
const originMessageBar = (
    <a>
        <div></div>
    </a>
);

function structureUntrustedDomain(domain = window.domain) {
    return (
        <div className='info-alert' style={{ textAlign: 'center' }}>
            <strong>
                <span className='i_small ri-spam-line'></span> 当前域({domain}
                )不可信，因为其未在信任域名中提及
            </strong>
        </div>
    );
}
const structureMusicPlay = <span className='i ri-play-line'></span>;
const structureMusicPause = <span className='i ri-pause-line'></span>;
function structureInfobarInfo() {
    return (
        <>
            <br />
            <h4>框架状态</h4>
            <br />
            <div className='flex-items'>
                <strong> URL: </strong>
                <span id='url'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 单页面访问量: </strong>
                <span id='url-visitors'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> RTheme框架状态: </strong>
                <span id='theme-state'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 网络连接状态: </strong>
                <span id='network-state'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> cookie状态: </strong>
                <span id='cookie-state'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 页面更新时间: </strong>
                <span id='page-update-time'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 缓存触发时间: </strong>
                <span id='loading-time'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 站点运行时长: </strong>
                <span id='up-time'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <hr />
            <div id='alert-info'></div>
            <div className='full center' id='uptime-list'>
                <span className='info-warning full center'>
                    <span className='i_small ri-swap-line'></span> 正在拉取页面状态信息...
                </span>
            </div>
        </>
    );
}

const structureInfobarMusic = (
    <>
        <br />
        <div className='form-control'>
            <input
                type='search'
                required={true}
                onInput={() =>
                    global.musicSearch(document.querySelector('#music-search-input').value)
                }
                onChange={() =>
                    global.musicSearch(document.querySelector('#music-search-input').value)
                }
                id='music-search-input'
            />
            <label>
                <span className='i_small ri-search-2-line' style={{ '--i': 0 }}>
                    &nbsp;
                </span>
                <span style={{ '--i': 1 }}>搜</span>
                <span style={{ '--i': 2 }}>索</span>
                <span style={{ '--i': 3 }}>在</span>
                <span style={{ '--i': 4 }}>线</span>
                <span style={{ '--i': 5 }}>资</span>
                <span style={{ '--i': 6 }}>源</span>
                <span style={{ '--i': 7 }}>.</span>
                <span style={{ '--i': 8 }}>.</span>
                <span style={{ '--i': 9 }}>.</span>
            </label>
        </div>
        <div id='music-search-program'> </div>
        <div id='alert-info'></div>
    </>
);
function structureInfobarShare() {
    return (
        <>
            <h5>
                <strong>当前链接:</strong>
            </h5>
            <div id='share-local' className='share-area'>
                <div className='share-input' id='input-area-local' contentEditable='true'></div>
                <div className='copy-button' id='copy-button-local'>
                    <span>
                        <span
                            onClick={() =>
                                global.copy(
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
                <div className='share-input' id='input-area-short' contentEditable='true'></div>
                <div className='copy-button' id='copy-button-short'>
                    <span>
                        <span
                            onClick={() =>
                                global.copy(
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
            <hr />
            <h5>
                <strong>分站链接:</strong>
            </h5>
            <div id='share-other'>
                <div className='square-loader'>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </>
    );
}
const structureInfobarSetting = (
    <>
        <h5>
            <strong>设置</strong>
        </h5>
        <br />
        <div id='setting-list'>
            <div className='square-loader'>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </>
);

const structureInfobarSwap = (
    <>
        <br />
        <h4 className='center' id='speed-test-info'>
            正在启动 SPEEDTEST
        </h4>
        <hr />
        <div id='speed-test-show'></div>
    </>
);

const structureSquareLoading = (
    <div className='square-loader'>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
    </div>
);
function structureErrorInfo(error) {
    <div className='info-alert center'>
        <strong>
            <span className='i_small ri-spam-line'></span> {error}
        </strong>
    </div>;
}
function getstructureMusicSearchResult(name, url, artist, pic, album) {
    return (
        <div className='music-search-list loading'>
            <div className='music-search-result'>
                <div className='music-search-info'>
                    <div className='music-search-img'>
                        <Image src={pic} loading='lazy' alt={name} />
                    </div>
                    <div className='music-search-title'>
                        <span className='music-search-name'>{name}</span>
                        <span className='music-search-author'>
                            {' '}
                            <span className='i_small ri-account-box-line'></span> {artist} -{' '}
                            <span className='i_small ri-mv-line'></span> {album}
                        </span>
                    </div>
                </div>
                <div className='music-search-operation'>
                    <span>
                        <span
                            className='i ri-add-fill'
                            onClick={() => {
                                global.copy(structureMusicExport(this), this.parentNode);
                            }}
                            data-name={name}
                            data-album={album}
                            data-url={url}
                            data-artist={artist}
                            data-pic={pic}
                        ></span>
                    </span>
                    <span
                        className='i ri-play-fill'
                        onClick={() => {
                            global.musicChange(`${name} - ${artist}`, url);
                        }}
                    ></span>
                </div>
            </div>
            <hr />
        </div>
    );
}

function structureMusicExport(e) {
    let name = e.getAttribute('data-name');
    let url = e.getAttribute('data-url');
    let artist = e.getAttribute('data-artist');
    let pic = e.getAttribute('data-pic');
    let album = e.getAttribute('data-album');

    return (
        <a
            href={url}
            type='music-box'
            info={
                "<span className='music-search-author'> <span className='i_small ri-account-box-line'></span>" +
                artist +
                " - <span className='i_small ri-mv-line'></span> " +
                album +
                '</span>'
            }
            src={pic}
        >
            {name}
        </a>
    );
}
function getMailFeedbackButton() {
    return (
        <a
            className='button'
            href={
                'mailto:ravelloh@outlook.com?subject=[错误反馈]网站资源错误&body=错误地址:' +
                window.location.pathname
            }
        >
            邮件反馈
        </a>
    );
}
function structurePlayingMusic(name) {
    return (
        <a onClick={() => global.openInfoBar('music')}>
            <strong>正在播放: {name}</strong>&nbsp;
            <span className='i ri-music-2-fill'></span>
        </a>
    );
}
const structureDownloadBar = (
    <>
        <hr />
        <h4>
            <strong>下载管理器 </strong>
        </h4>
        <br />
        <div className='flex-items'>
            <strong> 源地址: </strong>{' '}
            <span id='download-origin-url'>
                <div className='circle-loader'></div>
            </span>
        </div>
        <div className='flex-items'>
            <strong> 下载状态: </strong>{' '}
            <span id='download-state'>
                <div className='circle-loader'></div>
            </span>
        </div>
        <div className='flex-items'>
            <strong> 下载进度: </strong>{' '}
            <span id='download-progress'>
                <div className='circle-loader'></div>
            </span>
        </div>
        <div className='flex-items'>
            <strong> 已下载大小: </strong>{' '}
            <span id='download-done'>
                <div className='circle-loader'></div>
            </span>
        </div>
        <div className='flex-items'>
            <strong> 资源总大小: </strong>{' '}
            <span id='download-total'>
                <div className='circle-loader'></div>
            </span>
        </div>
        <div className='flex-items'>
            <strong> 下载速度: </strong>{' '}
            <span id='download-speed'>
                <div className='circle-loader'></div>
            </span>
        </div>
        <div className='flex-items'>
            <strong> 剩余时间: </strong>{' '}
            <span id='download-time'>
                <div className='circle-loader'></div>
            </span>
        </div>
        <hr />
    </>
);
const structureDownloadMessage = (
    <a className='breath' onClick={() => global.openInfoBar('info')}>
        <strong>正在下载 - 状态:活跃</strong>&nbsp;
        <span className='i ri-download-cloud-2-line'></span>
    </a>
);
const structureDownloadCompleteMessage = (
    <a className='green' onClick={() => global.musicChangeopenInfoBar('info')}>
        <strong>下载完成 </strong>&nbsp;<span className='i ri-chat-check-fill'></span>
    </a>
);

const structureDownloadErrorMessage = (
    <a className='red' onclick={() => global.openInfoBar('info')}>
        <strong>下载失败 </strong>&nbsp;<span className='i ri-signal-wifi-error-line'></span>
    </a>
);
function structureShareInput(id, path) {
    return (
        <div id={'share-global-' + id} className='share-area'>
            <div className='share-input' id={'input-area-' + id} contenteditable='true'>
                {'https://' + config.trustDomain[id] + path}
            </div>
            <div className='copy-button' id={'copy-button-' + id}>
                <span>
                    <span
                        onClick={() => {
                            copy(
                                this.parentNode.parentNode.parentNode.firstElementChild.innerHTML,
                                this.parentNode,
                            );
                        }}
                        className='i ri-file-copy-2-fill'
                    ></span>
                </span>
            </div>
        </div>
    );
}
function valueSettingItems() {
    return [
        ['启用PJAX加载模式', '允许进行非刷新式页面请求，启用单页应用程序模式', 'EnablePjaxLoad'],
        ['启用PJAX Debug模式', '允许输出更多调试信息', 'EnablePjaxDebug', ''],
        ['启用instant.page预加载', '启动被动式预加载，提高响应速率', 'EnableInstantPage'],
        ['启用API预检查', '允许预先请求API地址，以预先选择响应速度更快的API', 'EnableApiPrecheck'],
        [
            '启用BaiduStatistics分析器',
            '允许将部分访问情况提交至统计服务器，以帮助分析页面',
            'EnableBaiduTongji',
            '',
        ],
        [
            '启用Umami Analytics分析器',
            '允许与自建Umami服务通信，以统计页面访问情况',
            'EnableUmamiAnalytics',
        ],
        ['启用Umami 数据缓存', '允许使用会话存储以优化部分性能', 'EnableUmamiCache', ''],
        [
            '启用Umami 事件统计',
            '允许提交部分UI交互情况统计。会造成额外的网络请求',
            'EnableUmamiEvents',
        ],
        ['启用Umami API', '允许从Umami服务获取实时访客量等信息', 'EnableUmamiAPI'],
        ['启用Twikoo评论', '允许与评论服务器通信，以实现评论操作', 'EnableComment'],
        [
            '接管下载事件',
            '允许使用主题框架下载管理器替代浏览器下载，显示更多信息',
            'EnableDownloadFunction',
        ],
        [
            '使用Fetch下载模式',
            '使用fetch代替XMLHttpRequest下载，将无法显示进度',
            'UseFetchDownload',
            '',
        ],
        [
            '启用音乐状态保存',
            '允许将当前音乐播放列表保存至Cookie中，在页面重载后载入',
            'EnableMusicStateStorage',
        ],
        ['启用自动登录', '允许在访问时自动以登录身份重新刷新令牌', 'EnableAutoLogin'],
        ['启用站点状态显示', '允许访问Uptime服务以显示站点服务状态', 'EnableUptime'],
        ['启用目录高亮', '在显示目录时自动高亮正在阅读的位置', 'EnableMenuHighlight'],
        ['启用代码高亮', '允许对代码块渲染语法高亮', 'EnableCodeHighlight'],
        ['启用高级超链接', '允许渲染部分高级形式超链接', 'EnableAdvanceLink'],
        ['启用标题重组', '在页面加载时自动重组标题，以提供高级锚点功能', 'EnableUpdateMenu'],
        ['启用图片预加载', '允许在页面加载时自动触发后文图片预加载', 'EnableImgPrefetch'],
        ['启用图片重组', '在页面加载时自动重组图片，以提供描述功能', 'EnableImgReset'],
        ['启用生成页面模型', '允许生成页面模型，以进行文章筛选、排序等功能', 'EnablePageModel'],
        ['启用锚点识别', '在锚点改变时运行调用相关事件，以进行索引筛选', 'EnableHashCheck'],
        ['启用导航栏高亮', '允许在页面路径变化时高亮导航栏', 'EnableNavHighlight'],
        ['启用图片放大', '允许在单击图片时放大图片', 'EnableImgZoom'],
        ['启用消息队列', '启用右下方消息队列以显示更多信息', 'EnableMessage'],
        ['启用索引数据拉取', '允许使用索引数据以进行搜索', 'EnableSearchDataGet'],
        ['跳过模型验证', '跳过本地与云端数据模型匹配', 'EnableSkipModelTest', ''],
        ['启用文章旁路推荐', '允许在文章结尾链接至上一篇/下一篇文章', 'EnableArticlesRecommand'],
    ];
}
function structureSetting(name, describe, id, index, defaultState = 'checked') {
    var state;
    if (cookie.getItem('setting' + id) == 'false') {
        state = '';
    } else if (cookie.getItem('setting' + id) == 'true') {
        state = 'checked';
    } else {
        state = defaultState;
    }
    return (
        <div className='setting-list loading' key={index}>
            <div className='setting-result'>
                <div className='setting-info'>
                    <div className='setting-title'>
                        <span className='setting-name'>{name}</span>
                        <span className='setting-explain'>
                            {' '}
                            <span className='i_small ri-information-line'></span> {describe}
                        </span>
                    </div>
                </div>
                <div className='setting-operation'>
                    <span>
                        <input
                            type='checkbox'
                            id={id}
                            onChange={() => global.setting(this.id, this.checked)}
                            defaultChecked={state == 'checked' ? true : false}
                        />
                        <label htmlFor={id} className='switchs'></label>
                    </span>
                </div>
            </div>
            <hr />
        </div>
    );
}

function structureSwapList(domain) {
    return (
        <div className='flex-items'>
            <strong> {domain}: </strong>{' '}
            <span id={domain.replaceAll('.', '')} className='speed-test-result'>
                <div className='circle-loader'></div>
            </span>
        </div>
    );
}

function structureOnlineVistor(count = 1) {
    return (
        <a>
            <strong>在线访客: {count} </strong>&nbsp;<span className='i ri-earth-line'></span>
        </a>
    );
}

function structureArticlesInfo(model) {
    let cla = '';
    let tag = '';
    model.class.forEach((e) => {
        cla += `<a href="#/classification/${e}">${e}</a>/`;
    });
    cla = cla.substring(0, cla.length - 1);
    model.tag.forEach((e) => {
        tag += `<a href="#/tag/${e}">${e}</a>`;
    });
    return (
        <div className='loaded listprogram'>
            <article id='articles-more'>
                <span className='article-name center'>
                    <br />
                    <strong>
                        <a onClick={() => pjaxLoad(model.url)}>{model.name}</a>
                    </strong>
                </span>
                <hr />
                <div className='articles-info center'>
                    <time>{model.time}</time> • <span className='i_small ri-archive-line'></span>
                    <span className='class'>{cla}</span>
                </div>
                <hr className='light' />
                <div className='articles-tags center'>{tag}</div>
            </article>
            <hr />
        </div>
    );
}

function structureArticlesList(model) {
    let cla = '';
    let tag = '';
    model.class.forEach((e) => {
        cla += `<a href="#/classification/${e}">${e}</a>/`;
    });
    cla = cla.substring(0, cla.length - 1);
    model.tag.forEach((e) => {
        tag += `<a href="#/tag/${e}">${e}</a>`;
    });
    return (
        <div className='loaded listprogram'>
            <article>
                <span className='article-name'>
                    <h4>
                        <a onClick={() => global.pjaxLoad(model.url)}>{model.name}</a>
                    </h4>
                </span>
                <p className='articles-info'>
                    <time>{model.time}</time> • <span className='i_small ri-archive-line'></span>
                    <span className='class'>{cla}</span>
                </p>
                <p className='articles-tags'>{tag}</p>
            </article>
            <hr />
        </div>
    );
}

function structureInfobarSort() {
    return (
        <>
            <div id='articles-sort'>
                <br />
                <h4>排序方式</h4>
                <br />
                <div className='flex-items-center'>
                    <span onClick={() => global.sortArticles('time')} id='s-time'>
                        时间（从新到旧）
                    </span>
                    <span onClick={() => global.sortArticles('time-b')} id='s-time-b'>
                        时间（从旧到新）
                    </span>
                </div>
                <div className='flex-items-center'>
                    <span onClick={() => global.sortArticles('tag')} id='s-tag-b'>
                        标签（从多到少）
                    </span>
                    <span onClick={() => global.sortArticles('tag-b')} id='s-tag-b'>
                        标签（从少到多）
                    </span>
                </div>
                <div className='flex-items-center'>
                    <span onClick={() => global.sortArticles('cla')} id='s-cla'>
                        分类（从多到少）
                    </span>
                    <span onClick={() => global.sortArticles('cla-b')} id='s-cla-b'>
                        分类（从少到多）
                    </span>
                </div>
                <div className='flex-items-center'>
                    <span onClick={() => global.sortArticles('name')} id='s-name'>
                        名称（从A到Z）
                    </span>
                    <span onClick={() => global.sortArticles('name-b')} id='s-name-b'>
                        名称（从Z到A）
                    </span>
                </div>
            </div>
        </>
    );
}

function structureSearchResult(result) {
    let cla = '';
    let tag = '';
    let match = '';
    let matchItem, matchNum, matchContext, matchTag, matchClass, matchTitle, matchLinks;
    let strLinks = '';

    result.match.forEach((e) => {
        if (typeof e == 'object') {
            matchItem = e[0];
        } else {
            matchItem = e;
        }
        switch (matchItem) {
            case 'name':
                match += '标题 / ';
                break;
            case 'context':
                matchNum = e;
                match += `内容(${e[1]}次) / `;
                break;
            case 'title':
                match += '章节 / ';
                matchTitle = e;
                break;
            case 'tag':
                match += '标签 / ';
                matchTag = e;
                break;
            case 'class':
                match += '分类 / ';
                matchClass = e;
                break;
            case 'links':
                match += '外链 / ';
                matchLinks = e;
                break;
        }
    });
    result.class.forEach((e, index) => {
        if (typeof matchClass !== 'undefined' && matchClass[1] == index) {
            cla += `<a href="#/classification/${e}" className='active'>${e}</a>/`;
        } else {
            cla += `<a href="#/classification/${e}">${e}</a>/`;
        }
    });
    cla = cla.substring(0, cla.length - 1);
    result.tag.forEach((e, index) => {
        if (typeof matchTag !== 'undefined' && matchTag[1] == index) {
            tag += `<a href="#/tag/${e}" className='active'>${e}</a>`;
        } else {
            tag += `<a href="#/tag/${e}">${e}</a>`;
        }
    });
    match = match.substring(0, match.length - 3);
    if (typeof matchNum == 'undefined' || matchNum[2] < 10) {
        matchContext = result.context.substring(0, 150);
    } else {
        matchContext = result.context.substring(matchNum[2] - 10, matchNum[2] + 140);
    }
    result.links.forEach((e, index) => {
        if (typeof matchLinks !== 'undefined' && matchLinks[1] == index) {
            strLinks = `<a className='search-result-links one-line' href='${e}'><span className='i_small ri-link'></span> ${e}</a>`;
        }
    });
    return (
        <div className='loaded listprogram'>
            <article>
                <span className='article-name'>
                    <h4>
                        <a onClick={() => global.pjaxLoad(result.url)}>{result.name}</a>
                    </h4>
                </span>
                <p className='articles-info'>
                    <span className='search-result-tags'>{match}</span>
                    <time>{result.time}</time> • <span className='i_small ri-archive-line'></span>
                    <span className='class'>{cla}</span>
                    <div className='search-result-context'>
                        <span className='i_small ri-file-list-2-line'></span> ...{matchContext}
                    </div>
                    {strLinks}
                </p>
                <p className='articles-tags'>{tag}</p>
            </article>
            <hr />
        </div>
    );
}

function structureInfobarFeed() {
    return (
        <>
            <div className='full' id='feed-list'>
                <a href='https://ravelloh.top/feed/rss.xml' className='no-effect' target='_blank'>
                    <div>
                        <span className='i ri-rss-fill'></span> <span>RSS</span>
                    </div>
                </a>
                <a href='https://ravelloh.top/feed/atom.xml' className='no-effect' target='_blank'>
                    <div>
                        <span className='i ri-reactjs-fill'></span> <span>Atom</span>
                    </div>
                </a>
                <a href='https://ravelloh.top/feed/feed.json' className='no-effect' target='_blank'>
                    <div>
                        <span className='i ri-braces-fill'></span> <span>JSON Feed</span>
                    </div>
                </a>
            </div>
            <div className='center' id='mail-feed' onClick={() => global.feedMail()}>
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

function structureUptime(name, status, url, index) {
    let Icon;
    if (status == 'up') {
        Icon = <span className='i ri-check-fill'></span>;
    } else {
        Icon = <span className='i ri-signal-wifi-error-fill'></span>;
    }
    return (
        <a href={url} className='no-effect' target='_blank' key={index}>
            <div>
                {Icon} <span>{name}</span>
            </div>
        </a>
    );
}

const i18nModule = {
    collator,
    structurePrograssBar,
    originIconsLeftContext,
    structureErrorViewmap,
    originMessageBar,
    structureUntrustedDomain,
    structureMusicPlay,
    structureMusicPause,
    structureInfobarInfo,
    structureInfobarMusic,
    structureInfobarShare,
    structureInfobarSetting,
    structureInfobarSwap,
    structureSquareLoading,
    structureErrorInfo,
    getstructureMusicSearchResult,
    structureMusicExport,
    getMailFeedbackButton,
    structurePlayingMusic,
    structureDownloadBar,
    structureDownloadMessage,
    structureDownloadCompleteMessage,
    structureDownloadErrorMessage,
    structureShareInput,
    valueSettingItems,
    structureSetting,
    structureSwapList,
    structureOnlineVistor,
    structureArticlesInfo,
    structureArticlesList,
    structureInfobarSort,
    structureSearchResult,
    structureInfobarFeed,
    structureUptime,
};

export default i18nModule;