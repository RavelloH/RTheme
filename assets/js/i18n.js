// RTheme v3 - i18n.js(语言包)

const collator = new Intl.Collator('zh-Hans-CN', {
    numeric: true,
});

let githubUserName
structurePrograssBar =
    '<ul><li><div id="progress-container"><div id="progress"></div></div></li></ul>';
originIconsLeftContext = `
    <nav>
        <a style="--i: 1" id="icon-about" href="#about" onclick="openInfoBar('info');return false;" aria-label="about this page"><span class="i ri:file-info-line"></span></a>
        <a style="--i: 2" id="icon-github" href="http://github.com/${githubUserName}" target="_blank" rel="noreferrer" aria-label="my github"><span class="i ri:github-fill"></span></a>
        <a style="--i: 3" id="icon-rss" onclick="openInfoBar('feed')" aria-label="rss"><span class="i ri:rss-fill"></span></a>
    </nav>`;
structureErrorViewmap =
    '<div class="texts"><h2 class=>Error...</h2><h3>Page load failed.</h3><span class="virgule">请求的页面未成功加载。</span><span> <span class="i_small ri:error-warning-line"></span> 服务器无法正常返回资源</span><br><div class="button-list"><a class="button" onclick="pjaxLoad(\'\')">回退到上个页面</a> <a class="button" onclick="checklink(\'\')">尝试自动解决</a></div></div><div><span class="i_large ri:alert-line"></span></div>';
originMessageBar =
    '<noscript><a class="red" href="/about/help#javascript"><strong>错误:无法使用JAVASCRIPT</strong>&nbsp;<span class="i ri:alert-line"></span></a></noscript>';
structureLeaveMessage =
    '<a onclick="pjax.reload()">取消跳转&nbsp;<span class="i ri:arrow-go-back-line"></span></a>';
structureUntrustedDomainOne =
    '<div class="info-alert" style="text-align:center"><strong><span class="i_small ri:spam-line"></span> 当前域(';
structureUntrustedDomainTwo = ')不可信，因为其未在信任域名中提及</strong></div>';
structureMusicPlay = '<span class="i ri:play-line"></span>';
structureMusicPause = '<span class="i ri:pause-line"></span>';

function structureInfobarInfo() {
    return `
    <br><h4>框架状态</h4><br><div class="flex-items">
        <strong> URL: </strong> <span id="url"><div class="circle-loader"></div>
        </span>
    </div>
    
    <!-- 需要先配置Umami
    <div class="flex-items">
        <strong> 单页面访问量: </strong> <span id="url-visitors"><div class="circle-loader"></div>
        </span>
    </div>
    -->
    
    <div class="flex-items">
        <strong> RTheme框架状态: </strong> <span id="theme-state"><div class="circle-loader"></div>
        </span>
    </div>
    <div class="flex-items">
        <strong> 网络连接状态: </strong> <span id="network-state"><div class="circle-loader"></div>
        </span>
    </div>
    <div class="flex-items">
        <strong> PJAX状态: </strong> <span id="pjax-state"><div class="circle-loader"></div>
        </span>
    </div>
    <div class="flex-items">
        <strong> cookie状态: </strong> <span id="cookie-state"><div class="circle-loader"></div>
        </span>
    </div>
    <div class="flex-items">
        <strong> 页面更新时间: </strong> <span id="page-update-time"><div class="circle-loader"></div>
        </span>
    </div>
    <div class="flex-items">
        <strong> 缓存触发时间: </strong> <span id="loading-time"><div class="circle-loader"></div>
        </span>
    </div>
    <div class="flex-items">
        <strong> 站点运行时长: </strong> <span id="up-time"><div class="circle-loader"></div>
        </span>
    </div>
    <hr>
    <div id="alert-info"></div>
    
    <!-- 需要先配置Uptime
    <div class="full center" id="uptime-list">
    <span class="info-warning full center"><span class="i_small ri:swap-line"></span> 正在拉取页面状态信息...</span>
    </div>
    -->
    `;
}

structureInfobarMusic =
    '<br><div class="form-control"><input type="search" required="" oninput="musicSearch(this.value)" onpropertychange="musicSearch(this.value)" /><label><span class="i_small ri:search-2-line" style="--i: 0;">&nbsp;</span><span style="--i: 1">搜</span><span style="--i: 2">索</span><span style="--i: 3">在</span><span style="--i: 4">线</span><span style="--i: 5">资</span><span style="--i: 6">源</span><span style="--i: 7">.</span><span style="--i: 8">.</span></span><span style="--i: 9">.</span></label></label></div><div id="music-search-program"> </div><div id="alert-info"></div>';
function structureInfobarShare() {
    return `
    <h5><strong>当前链接:</strong></h5>
    <div id="share-local" class="share-area">
        <div class="share-input" id="input-area-local" contenteditable="true"></div>
        <div class="copy-button" id="copy-button-local">
            <span><span onclick='copy(this.parentNode.parentNode.parentNode.firstElementChild.innerHTML,this.parentNode)' class='i ri:file-copy-2-fill'></span></span>
        </div>
    </div>
    <div id="share-local" class="share-area">
        <div class="share-input" id="input-area-short" contenteditable="true"></div>
        <div class="copy-button" id="copy-button-short">
            <span><span onclick='copy(this.parentNode.parentNode.parentNode.firstElementChild.innerHTML,this.parentNode)' class='i ri:file-copy-2-fill'></span></span>
        </div>
    </div>
    <hr>
    <h5><strong>分站链接:</strong></h5>
    <div id="share-other">
        <div class="square-loader">
            <span></span><span></span><span></span><span></span><span></span>
        </div>
    </div>`;
}
structureInfobarSetting =
    '<h5><strong>设置</strong></h5><br><div id="setting-list"><div class="square-loader"><span></span><span></span><span></span><span></span><span></span></div></div>';
structureInfobarSwap =
    '<br><h4 class="center" id="speed-test-info">正在启动 SPEEDTEST</h4><hr><div id="speed-test-show"></div>';
structureSquareLoading =
    '<div class="square-loader"><span></span><span></span><span></span><span></span><span></span></div>';
function structureErrorInfo(error) {
    return `<div class="info-alert center"><strong><span class="i_small ri:spam-line"></span> ${error}</div>`;
}
function getstructureMusicSearchResult(name, url, artist, pic, album) {
    return `
    <div class="music-search-list loading">
    <div class="music-search-result">
        <div class="music-search-info">
            <div class="music-search-img">
                <img src=\'${pic}\' loading="lazy">
            </div>
            <div class="music-search-title">
                <span class="music-search-name">${name}</span><span class="music-search-author"> <span class="i_small ri:account-box-line"></span> ${artist} - <span class="i_small ri:mv-line"></span> ${album}</span>
            </div>
        </div>
        <div class="music-search-operation">
        <span>
            <span class="i ri:add-fill" onclick="copy(structureMusicExport(this),this.parentNode)" data-name="${name}" 
            data-album="${album}" data-url="${url}" data-artist="${artist}" data-pic="${pic}"></span>
        </span>
        <span class="i ri:play-fill" onclick="musicChange(\'${name} - ${artist}\',\'${url}\')"></span>
        </div>
    </div>
    <hr>
    </div>`;
}

function structureMusicExport(e) {
    let name = e.getAttribute('data-name');
    let url = e.getAttribute('data-url');
    let artist = e.getAttribute('data-artist');
    let pic = e.getAttribute('data-pic');
    let album = e.getAttribute('data-album');

    return `<a href="${url}" type="music-box" info="<span class='music-search-author'> <span class='i_small ri:account-box-line'></span> ${artist} - <span class='i_small ri:mv-line'></span> ${album}</span>" src="${pic}">${name}</a>
    `;
}
function getMailFeedbackButton() {
    return (
        "<a class='button' href='mailto:${authorMail}?subject=[错误反馈]网站资源错误&body=错误地址:" +
        window.location.pathname +
        "'>邮件反馈</a>"
    );
}
function structurePlayingMusic(name) {
    return `
    <a onclick="openInfoBar('music')">
        <strong>正在播放: ${name}</strong>&nbsp;
        <span class="i ri:music-2-fill"></span>
    </a>
    `;
}
structureDownloadBar =
    '<hr><h4><strong>下载管理器 </strong></h4><br><div class="flex-items"><strong> 源地址: </strong> <span id="download-origin-url"><div class="circle-loader"></div></span></div><div class="flex-items"><strong> 下载状态: </strong> <span id="download-state"><div class="circle-loader"></div></span></div><div class="flex-items"><strong> 下载进度: </strong> <span id="download-progress"><div class="circle-loader"></div></span></div><div class="flex-items"><strong> 已下载大小: </strong> <span id="download-done"><div class="circle-loader"></div></span></div><div class="flex-items"><strong> 资源总大小: </strong> <span id="download-total"><div class="circle-loader"></div></span></div><div class="flex-items"><strong> 下载速度: </strong> <span id="download-speed"><div class="circle-loader"></div></span></div><div class="flex-items"><strong> 剩余时间: </strong> <span id="download-time"><div class="circle-loader"></div></span></div><hr>';
structureDownloadMessage =
    '<a class="breath" onclick="openInfoBar(\'info\')"><strong>正在下载 - 状态:活跃</strong>&nbsp;<span class="i ri:download-cloud-2-line"></span></a>';
structureDownloadCompleteMessage =
    '<a class="green" onclick="openInfoBar(\'info\')"><strong>下载完成 </strong>&nbsp;<span class="i ri:chat-check-fill"></span></a>';
structureDownloadErrorMessage =
    '<a class="red" onclick="openInfoBar(\'info\')"><strong>下载失败 </strong>&nbsp;<span class="i ri:signal-wifi-error-line"></span></a>';
function structureShareInput(id, path) {
    return `
    <div id="share-global-${id}" class="share-area">
        <div class="share-input" id="input-area-${id}" contenteditable="true">${
            'https://' + trustDomain[id] + path
        }</div>
        <div class="copy-button" id="copy-button-${id}"><span><span onclick='copy(this.parentNode.parentNode.parentNode.firstElementChild.innerHTML,this.parentNode)' class='i ri:file-copy-2-fill'></span></span>
             </div>
    </div>`;
}
function valueSettingItems() {
    return [
        ['启用PJAX加载模式', '允许进行非刷新式页面请求，启用单页应用程序模式', 'EnablePjaxLoad'],
        ['启用PJAX Debug模式', '允许输出更多调试信息', 'EnablePjaxDebug', ''],
        ['启用instant.page预加载', '启动被动式预加载，提高响应速率', 'EnableInstantPage'],
        ['启用API预检查', '允许预先请求API地址，以预先选择响应速度更快的API', 'EnableApiPrecheck'],
        /*
        [
            '启用BaiduStatistics分析器',
            '允许将部分访问情况提交至统计服务器，以帮助分析页面',
            'EnableBaiduTongji',
            '',
        ],
        */
        /*
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
        */
        /*
        ['启用Twikoo评论', '允许与评论服务器通信，以实现评论操作', 'EnableComment'],
        */
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
        /*
        ['启用站点状态显示', '允许访问Uptime服务以显示站点服务状态', 'EnableUptime'],
        */
        ['启用目录高亮', '在显示目录时自动高亮正在阅读的位置', 'EnableMenuHighlight'],
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
function structureSetting(name, describe, id, defaultState = 'checked') {
    var state;
    if (docCookies.getItem('setting' + id) == 'false') {
        state = '';
    } else if (docCookies.getItem('setting' + id) == 'true') {
        state = 'checked';
    } else {
        state = defaultState;
    }
    return `
    <div class="setting-list loading">
        <div class="setting-result">
            <div class="setting-info">
                <div class="setting-title">
                    <span class="setting-name">${name}</span><span class="setting-explain"> <span class="i_small ri:information-line"></span> ${describe}</span>
                </div>
            </div>
            <div class="setting-operation">
                <span>
                    <input type="checkbox" id="${id}" onchange="setting(this.id,this.checked)" ${state} />
                    <label for="${id}" class="switchs"></label>
                </span>
            </div>
        </div>
        <hr>
    </div>`;
}

function structureSwapList(domain) {
    return `
    <div class="flex-items">
        <strong> ${domain}: </strong> <span id="${domain.replaceAll(
            '.',
            '',
        )}" class='speed-test-result'><div class="circle-loader"></div></span>
    </div>
    `;
}

function structureOnlineVistor(count = 1) {
    return `
    <a><strong>在线访客: ${count} </strong>&nbsp;<span class="i ri:earth-line"></span></a>`;
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
    return `
    <div class="loaded listprogram">
    <article id='articles-more'>
        <span class="article-name center"><br>
            <strong><a onclick="pjaxLoad('${model.url}')">${model.name}</a></strong>
        </span>
        <hr>
        <div class="articles-info center">
            <time>${model.time}</time> • <span class="i_small ri:archive-line"></span>
            <span class="class">
            ${cla}
            </span>
        </div>
        <hr class='light'>
        <div class="articles-tags center">
        ${tag}
        </div>
    </article>
    <hr>
    </div>
    `;
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
    return `
    <div class="loaded listprogram">
        <article>
            <span class="article-name">
            <h4><a onclick="pjaxLoad('${model.url}')">${model.name}</a></h4>
            </span>
            <p class="articles-info">
                <time>${model.time}</time> • <span class="i_small ri:archive-line"></span>
                <span class="class">
                    ${cla}
                </span>
            </p>
            <p class="articles-tags">
                ${tag}
            </p>
        </article>
        <hr>
    </div>
    `;
}

function structureInfobarSort() {
    return `
    <div id='articles-sort'>
    <br><h4>排序方式</h4><br>
    <div class="flex-items-center">
    <span onclick="sortArticles('time')" id='s-time'>时间（从新到旧）</span>
    <span onclick="sortArticles('time-b')" id='s-time-b'>时间（从旧到新）</span>
    </div>
    <div class="flex-items-center">
    <span onclick="sortArticles('tag')" id='s-tag-b'>标签（从多到少）</span>
    <span onclick="sortArticles('tag-b')" id='s-tag-b'>标签（从少到多）</span>
    </div>
    <div class="flex-items-center">
    <span onclick="sortArticles('cla')" id='s-cla'>分类（从多到少）</span>
    <span onclick="sortArticles('cla-b')" id='s-cla-b'>分类（从少到多）</span>
    </div>
    <div class="flex-items-center">
    <span onclick="sortArticles('name')" id='s-name'>名称（从A到Z）</span>
    <span onclick="sortArticles('name-b')" id='s-name-b'>名称（从Z到A）</span>
    </div>
    </div>
    `;
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
            cla += `<a href="#/classification/${e}" class='active'>${e}</a>/`;
        } else {
            cla += `<a href="#/classification/${e}">${e}</a>/`;
        }
    });
    cla = cla.substring(0, cla.length - 1);
    result.tag.forEach((e, index) => {
        if (typeof matchTag !== 'undefined' && matchTag[1] == index) {
            tag += `<a href="#/tag/${e}" class='active'>${e}</a>`;
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
            strLinks = `<a class='search-result-links one-line' href='${e}'><span class='i_small ri:link'></span> ${e}</a>`;
        }
    });
    return `
    <div class="loaded listprogram">
        <article>
            <span class="article-name">
            <h4><a onclick="pjaxLoad(\'${result.url}\')">${result.name}</a></h4>
            </span>
            <p class="articles-info">
                <span class='search-result-tags'>${match}</span>
                <time>${result.time}</time> • <span class="i_small ri:archive-line"></span>
                <span class="class">
                    ${cla}
                </span>
                <div class='search-result-context'><span class='i_small ri:file-list-2-line'></span> ...${matchContext}</div>
                ${strLinks}
            </p>
            <p class="articles-tags">
                ${tag}
            </p>
        </article>
        <hr>
    </div>
    `;
}

function structureLayoutUserbar() {
    return `
    <div id="userbar-head">
        <div id="userbar-title">
            账号
        </div>
        <div id="userbar-toggle" onclick="toggleLayoutUserbar()">
            <span class="i ri:arrow-left-s-line"></span>
        </div>
    </div>
    <div id="userbar-context">
        <div id="user-info">
                <img id="user-avatar" src="/assets/images/user.jpg" alt="User avatar">
            <div id="user-describe">
                <span id="user-name">未登录</span>
                <span id="user-bio">未设置描述...</span>
            </div>
        </div>
        <div id='user-main'>
        <div class="square-loader"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
    </div>
    <div id="userbar-bottom">
        <hr>
        <div class="flex-iconset">
            <ul>
                <li><a href="#account" id="icon-account" onclick="openUserbar('account');return false;" aria-label="account"><span
                    class="i ri:account-circle-line"></span></a></li>
                <li><a href="#account-setting" id="icon-account-setting" onclick="openUserbar('setting');return false;" aria-label="account setting"><span
                    class="i ri:user-settings-line"></span></a></li>
                <li><a href="#message-setting" id="icon-message-setting" onclick="openUserbar('message-setting');return false;"
                    aria-label="message-setting"><span class="i ri:mail-settings-line"></span></a></li>
                <li><a href="#message" id="icon-message" onclick="openUserbar('message');return false;"
                    aria-label="message"><span class="i ri:message-2-line"></span></a></li>
                <li><a href="#" id="icon-logout" onclick="openUserbar('logout');return false;"
                    aria-label="logout"><span class="i ri:logout-box-r-line"></span></a></li>
            </ul>
        </div>
    </div>
    `;
}

function structureInfobarFeed() {
    return `
    <div class="full" id="feed-list">
    <a href="https://ravelloh.top/feed/rss.xml" class="no-effect" target="_blank">
    <div>
        <span class="i ri:rss-fill"></span> <span>RSS</span>
    </div>
    </a>
    <a href="https://ravelloh.top/feed/atom.xml" class="no-effect" target="_blank">
    <div>
        <span class="i ri:reactjs-fill"></span> <span>Atom</span>
    </div>
    </a>
    <a href="https://ravelloh.top/feed/feed.json" class="no-effect" target="_blank">
    <div>
        <span class="i ri:braces-fill"></span> <span>JSON Feed</span>
    </div>
    </a>
    </div>
    <div class="center" id="mail-feed" onclick="feedMail()">
    <span class="i ri:mail-add-fill"></span> <span>邮箱订阅</span>
    </div>
    <hr>
    <h2>订阅</h2>
    <p>
    在上方选择相应的订阅格式获取链接，订阅将在新内容发布后自动同步。<br>
    或者，也可以在登录后使用邮箱订阅。订阅后，有更新时会向绑定的邮箱发送通知。
    </p>
    `;
}

function structureUptime(name, status, url) {
    let icon;
    if (status == 'up') {
        icon = '<span class="i ri:check-fill"></span>';
    } else {
        icon = '<span class="i ri:signal-wifi-error-fill"></span>';
    }
    return `
    <a href="${url}" class="no-effect" target="_blank">
    <div>
        ${icon} <span>${name}</span>
    </div>
    </a>
    `;
}
