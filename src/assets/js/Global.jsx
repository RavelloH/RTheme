// RTheme v4 Global Javascript
import cookie from './lib/cookie.js';
import analysis from './analysis.js';
import i18n from './i18n.jsx';
import { Base64 } from 'js-base64';
import config from '../../../config.js';
import switchElementContent from '../../utils/switchElement.js';
import display from './display.js';
import message from '@/utils/message.js';
import token from '@/utils/token.js';

// 全局声明
let domMenuToggle,
    domBody,
    domShadeContext,
    domShadeGlobal,
    domLayoutInfoBar,
    domInfoBarToggle,
    domLayoutUserBar,
    domUserbarToggle,
    domMusic,
    musicProgressbar,
    musicProfather,
    infoBarMode,
    domLoadShade,
    musicApi,
    currentInfoBarInner,
    closeErrorBar,
    searchTimer,
    changeMusicProgress,
    accountTimer;

let errorList = [];

const isBrowser = () => typeof window !== 'undefined';

function resetElements() {
    domMenuToggle = document.querySelector('#toggle');
    domBody = document.querySelector('body');
    domShadeContext = document.querySelector('#shade-context');
    domShadeGlobal = document.querySelector('#shade-global');
    domLayoutInfoBar = document.querySelector('#infobar');
    domInfoBarToggle = document.querySelector('#infobar-toggle');
    domUserbarToggle = document.querySelector('#logo');
    domLayoutUserBar = document.querySelector('#userbar');
    domMusic = document.querySelector('#music');
    musicProgressbar = document.querySelector('#music-progress');
    musicProfather = document.querySelector('#music-progress-container');
    domLoadShade = document.querySelector('#load-shade');
}

// 刷新Cookie状态
function resetCookies() {
    if (cookie.hasItem('isCookieReseted') == false) {
        cookie.setItem('isCookieReseted', true);
    }
}

if (isBrowser()) {
    let observer = new MutationObserver((mutations) => {
        if (document.documentElement.childElementCount > 0) {
            loadComplete();
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

function loadPage() {
    if (!isBrowser()) {
        return;
    }
    resetElements();
    resetCookies();
    addListeners();
    switchElementContent('#year', getTime('yyyy'), 0);
    zoomPics();
    document.addEventListener('click', function (event) {
        let target = event.target;
        if (target.href && target.href !== window.location.href) {
            const targetUrl = new URL(target.href);
            const currentUrl = new URL(window.location.href);
            if (targetUrl.pathname === currentUrl.pathname && targetUrl.hash !== currentUrl.hash) {
                return;
            }
            event.preventDefault();
            let url = target.href;
            fadeOutPage('#viewmap');
            message.add(i18n.originMessageBar, 0);
            if (isLayoutMenuOpen() == true) {
                toggleLayoutMenu();
            }
            if (isLayoutUserbarOpen()) {
                toggleLayoutUserbar();
            }
            if (typeof closeErrorBar !== 'undefined') {
                clearTimeout(closeErrorBar);
            }
            hiddenPageContent();
            setTimeout(() => (window.location.href = url), 400);
            switchElementContent(
                '#message-bar',
                <a>
                    <div className='circle-loader'></div>
                </a>,
            );
        }
    });

    loadAccount();
    analysis.umamiAnalytics();
    if (analyzeURL(window.location.href, 'u') !== '') {
        window.location.href = base.decrypt(analyzeURL(window.location.href, 'u'));
    }
    switchElementContent('#loading-text', <span className='green-text'> Completed.</span>);
    message.switch('', 450);

    if (
        window &&
        performance.navigation.type == 0 &&
        document.referrer.startsWith(window.location.origin)
    ) {
        // domLoadShade.classList.toggle('active');
        var loadList = document.querySelectorAll('.loading:not(.listprogram)');
        for (let i = 0; i < loadList.length; i++) {
            loadList[i].classList.add('loaded');
        }
        firstLoad();
        loadPageType();
    } else {
        setTimeout(function () {
            domLoadShade.classList.toggle('active');
            setTimeout(function () {
                var loadList = document.querySelectorAll('.loading:not(.listprogram)');
                for (let i = 0; i < loadList.length; i++) {
                    loadList[i].classList.add('loaded');
                }
                setTimeout(() => {
                    loadPageType();
                }, 0);
                firstLoad();
            }, 500);
        }, 600);
    }
}

function loadComplete() {
    if (
        cookie.getItem('lastLoadTime') == null ||
        parseInt(getTime('yyyyMMDDhhmmss')) - parseInt(cookie.getItem('lastLoadTime')) >= 500
    ) {
        setTimeout(function () {
            loadPage();
            cookie.setItem('lastLoadTime', getTime('yyyyMMDDhhmmss'));
        }, 300);
    } else {
        setTimeout(function () {
            loadPage();
            cookie.setItem('lastLoadTime', getTime('yyyyMMDDhhmmss'));
        }, 300);
    }
}

function firstLoad() {
    import('instant.page/instantpage.js');
    loadPageType();
    if (cookie.getItem('musicPlayingName') !== null) {
        switchElementContent('#music-name', cookie.getItem('musicPlayingName'));
    }
    if (cookie.getItem('musicPlayingSource') !== null) {
        music.src = cookie.getItem('musicPlayingSource');
        music.load();
    }
    infoBarMode = '';
}

function preload(href) {
    const preloadLink = document.createElement('link');
    preloadLink.href = href;
    preloadLink.rel = 'preload';
    preloadLink.as = 'script';
    document.head.appendChild(preloadLink);
}

function addScript(url, onloadFunction = '') {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.setAttribute('onload', onloadFunction);
    head.appendChild(script);
}

if (isBrowser()) {
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        var string = msg.toLowerCase();
        var substring = 'script error';
        if (string.indexOf(substring) > -1) {
            alert('错误：侦测到脚本错误，无法初始化页面');
        } else {
            let message = `
        <hr>
        <div class='center'>
        <h2>初始化异常</h2>
        <h3>LOAD<span id='loading-text'><span class="red-text"> Failed.</span></span></h3>
        <p><strong>消息: </strong>${msg}<p>
        <p><strong>URL: </strong>${url}<p>
        <p><strong>行号: </strong>${lineNo}<p>
        <p><strong>列数: </strong>${columnNo}<p>
        <p><strong>类型: </strong>${JSON.stringify(error)}<p>
        </div>
        <hr>
        <br>
        `;
            document.querySelector('#load-content').innerHTML = message;
            errorList.push(JSON.stringify(error));
        }
        return false;
    };
}

// 右菜单开关
function toggleLayoutMenu() {
    domMenuToggle.classList.toggle('active');
    domBody.classList.toggle('active');
    domShadeContext.classList.toggle('active');
    if (isLayoutMenuOpen()) {
        currentInfoBarInner = getElementInnerhtml('#message-bar');
        if (
            cookie.getItem('settingEnableUmamiAnalytics') !== 'false' &&
            cookie.getItem('settingEnableUmamiEvents') !== 'false'
        ) {
            analysis.getRealTimeVisitors('switch');
        }
    } else {
        if (typeof currentInfoBarInner !== 'undefined') {
            message.switch(currentInfoBarInner);
            currentInfoBarInner = undefined;
        }
    }
}

// 下拉栏开关
function toggleLayoutInfobar() {
    if (isLayoutMenuOpen() == true) {
        toggleLayoutMenu();
    }
    domLayoutInfoBar.classList.toggle('active');
    domShadeGlobal.classList.toggle('active');
    setTimeout(() => enableInfobarRefersh(), 0);
}

function toggleLayoutUserbar() {
    loadAccount();
    domLayoutUserBar.classList.toggle('active');
    domShadeGlobal.classList.toggle('active');
}

// 右菜单状态
function isLayoutMenuOpen() {
    if (domMenuToggle.classList[2] == 'active') {
        return true;
    } else {
        return false;
    }
}

// 下拉栏状态
function isLayoutInfobarOpen() {
    if (domLayoutInfoBar.classList[0] == 'active') {
        return true;
    } else {
        return false;
    }
}

// 用户栏状态
function isLayoutUserbarOpen() {
    if (domLayoutUserBar.classList[0] == 'active') {
        return true;
    } else {
        return false;
    }
}

// 切换页面内容
function hiddenPageContent() {
    const element = document.querySelector('#viewmap');
    element.style.opacity = '1';
    // element.style.left = '0'
    element.style.transition = 'all 350ms';
    element.style.opacity = '0';
    // element.style.left = '-60%'
}

// 高亮元素
function highlightElement(selector) {
    const element = document.querySelector(selector);
    const originColor = element.style.color;
    element.style.transition = 'color 500ms';
    element.style.color = 'var(--theme-orange)';
    setTimeout(() => {
        element.style.color = originColor;
    }, 1500);
}

// 延时，搭配asymc wait使用
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 页面主题切换
function fadeOutPage(selector, time = 450) {
    const element = document.querySelector(selector);
    element.style.opacity = '1';
    element.style.transition = `opacity ${time}ms,left ${time}ms`;
    element.style.opacity = '0';
}

// 获取元素InnerHTML
function getElementInnerhtml(selector) {
    const element = document.querySelector(selector) || undefined;
    if (typeof element !== 'undefined') {
        return element.innerHTML;
    } else {
        return null;
    }
}

// 初始化监听器
function addListeners() {
    addEventListener('copy', (event) => {
        message.add('<a>已复制 &nbsp;<span class="i ri-file-copy-2-line"></span></a>', 2000);
    });
    addEventListener('cut', (event) => {
        message.add('<a>已剪切 &nbsp;<span class="i ri-scissors-cut-line"></span></a>', 2000);
    });
    addEventListener('paste', (event) => {
        message.add('<a>已粘贴 &nbsp;<span class="i ri-chat-check-line"></span></a>', 2000);
    });
    window.addEventListener(
        'hashchange',
        function () {
            checkPageHash();
        },
        false,
    );
    addEventListener('offline', (event) => {
        message.add('<a>互联网连接已断开 <span class="i ri-cloud-off-line"></span></a>', 5000);
    });
    domMenuToggle.addEventListener('click', () => {
        toggleLayoutMenu();
    });
    domShadeContext.addEventListener('click', () => {
        toggleLayoutMenu();
    });
    domShadeGlobal.addEventListener('click', () => {
        if (isLayoutInfobarOpen()) {
            toggleLayoutInfobar();
        }
        if (isLayoutUserbarOpen()) {
            toggleLayoutUserbar();
        }
    });
    domInfoBarToggle.addEventListener('click', () => {
        toggleLayoutInfobar();
    });
    domUserbarToggle.addEventListener('click', () => {
        toggleLayoutUserbar();
    });
}

// 全屏
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// 时间处理
function getTime(formats, startTime = '') {
    var yyyy, MM, DD, hh, mm, ss;
    var today = new Date();
    if (startTime == '') {
        yyyy = today.getFullYear();
        MM = String(today.getMonth() + 1).padStart(2, '0');
        DD = String(today.getDate()).padStart(2, '0');
        hh = String(today.getHours()).padStart(2, '0');
        mm = String(today.getMinutes()).padStart(2, '0');
        ss = String(today.getSeconds()).padStart(2, '0');
        return formats
            .replace(/yyyy/g, yyyy)
            .replace(/MM/g, MM)
            .replace(/DD/g, DD)
            .replace(/hh/g, hh)
            .replace(/mm/g, mm)
            .replace(/ss/g, ss);
    } else {
        var T, M, A, B, C, D, a, b, c;
        var lastDay = new Date(startTime);
        T = today.getTime() - lastDay.getTime();
        M = 24 * 60 * 60 * 1000;
        a = T / M;
        A = Math.floor(a);
        b = (a - A) * 24;
        B = Math.floor(b);
        c = (b - B) * 60;
        C = Math.floor((b - B) * 60);
        D = Math.floor((c - C) * 60);
        return formats.replace(/DD/g, A).replace(/hh/g, B).replace(/mm/g, C).replace(/ss/g, D);
    }
}

// 目录重组
function updateMenu() {
    var menuStructure = "<div id='articles-menu'>";
    let titleSet = document.querySelectorAll(
        '#articles-header h1 , #articles-body h2 , #articles-body h3 , #articles-body h4 , #articles-body h5 , #articles-body h6',
    );
    titleSet.forEach((element) => {
        switch (element.outerHTML.substring(0, 3)) {
            case '<h1':
                menuStructure += `<br><span class='t1 center'>${element.innerHTML}</span><hr>`;
                break;
            case '<h2':
                menuStructure += `<span class='t2'>${
                    '&nbsp;'.repeat(2) + '<span>' + element.innerHTML + '</span>'
                }</span></br>`;
                break;
            case '<h3':
                menuStructure += `<span class='t3'>${
                    '&nbsp;'.repeat(4) + '<span>' + element.innerHTML + '</span>'
                }</span></br>`;
                break;
            case '<h4':
                menuStructure += `<span class='t4'>${
                    '&nbsp;'.repeat(6) + '<span>' + element.innerHTML + '</span>'
                }</span></br>`;
                break;
            case '<h5':
                menuStructure += `<span class='t5'>${
                    '&nbsp;'.repeat(8) + '<span>' + element.innerHTML + '</span>'
                }</span></br>`;
                break;
            case '<h6':
                menuStructure += `<span class='t6'>${
                    '&nbsp;'.repeat(10) + '<span>' + element.innerHTML + '</span>'
                }</span></br>`;
                break;
        }
    });
    menuStructure += '</div>';
    return menuStructure;
}

// 目录高亮
function highlightMenu() {
    if (cookie.getItem('settingEnableMenuHighlight') == 'false') {
        return false;
    }
    document.querySelectorAll('#articles-menu *.active').forEach((element) => {
        element.classList.remove('active');
    });
    const titleList = document.querySelectorAll(
        '#articles-body h2 , #articles-body h3 , #articles-body h4 , #articles-body h5 , #articles-body h6',
    );
    for (let i = 0; i < titleList.length; i++) {
        let heights = getHeightDifferent(titleList[i]);
        if (heights == 0) {
            document
                .querySelector(`#articles-menu #${titleList[i].firstChild.id}`)
                .classList.add('active');
            return titleList[i];
        }
        if (heights > 0) {
            document
                .querySelector(`#articles-menu #${titleList[i - 1].firstChild.id}`)
                .classList.add('active');
            return titleList[i - 1];
        }
    }
    return false;
}

// 相对高度差
function getHeightDifferent(element) {
    const rect = element.getBoundingClientRect();
    const vWidth = document.querySelector('#viewmap article').clientWidth;
    const vHeight = document.querySelector('#viewmap article').clientHeight;

    if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) {
        return rect.top;
    }

    return 0;
}

// InfoBar功能分发
function openInfoBar(mode) {
    infoBarMode = mode || '';
    switch (mode) {
        case 'info':
            switchElementContent('#infobar-left', i18n.structureInfobarInfo(), 0);
            break;
        case 'music':
            musicSetting();
            preload('/assets/images/music.jpg');
            break;
        case 'menu':
            switchElementContent('#infobar-left', updateMenu(), 0);
            setTimeout(() => {
                highlightMenu();
                document.querySelector('#articles-menu').onclick = () =>
                    setTimeout(() => highlightMenu(), 1000);
            }, 10);
            break;
        case 'setting':
            switchElementContent('#infobar-left', i18n.structureInfobarSetting, 0);
            var settingItems = i18n.valueSettingItems();
            var settingList = [];
            settingItems.forEach(function (item) {
                if (item.length == 4) {
                    settingList.push(
                        i18n.structureSetting(item[0], item[1], item[2], settingList.length + 1, [
                            3,
                        ]),
                    );
                } else {
                    settingList.push(
                        i18n.structureSetting(item[0], item[1], item[2], settingList.length + 1),
                    );
                }
            });
            setTimeout(() => switchElementContent('#setting-list', settingList, 300), 300);
            setTimeout(() => loadItems('#setting-list'), 700);
            break;
        case 'swap':
            switchElementContent('#infobar-left', i18n.structureInfobarSwap, 0);
            break;
        case 'share':
            switchElementContent('#infobar-left', i18n.structureInfobarShare(), 0);
            break;
        case 'articles-sort':
            switchElementContent('#infobar-left', i18n.structureInfobarSort(), 0);
            break;
        case 'feed':
            switchElementContent('#infobar-left', i18n.structureInfobarFeed(), 0);
    }
    switchElementContent('#infobar-title', mode, 300);
    toggleLayoutInfobar();
}

// 音乐搜索
function musicSearch(name) {
    if (name !== '') {
        switchElementContent('#music-search-program', i18n.structureSquareLoading);
        if (typeof searchTimer !== 'undefined') {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(function () {
            fetch(musicApi + name)
                .then((response) => response.json())
                .then((data) => {
                    var musicSearchResult = [];
                    for (let i = 0; i < data['result']['songs'].length; i++) {
                        var artists = '';
                        for (let j = 0; j < data['result']['songs'][i]['ar'].length; j++) {
                            artists = artists + data['result']['songs'][i]['ar'][j]['name'] + '/';
                        }
                        artists = artists.substring(0, artists.length - 1);
                        musicSearchResult.push(
                            i18n.getstructureMusicSearchResult(
                                data['result']['songs'][i]['name'],
                                'http://music.163.com/song/media/outer/url?id=' +
                                    data['result']['songs'][i]['id'] +
                                    '.mp3',
                                artists,
                                data['result']['songs'][i]['al']['picUrl'],
                                data['result']['songs'][i]['al']['name'],
                            ),
                        );
                    }
                    switchElementContent('#music-search-program', musicSearchResult, 200);
                    setTimeout(() => {
                        loadItems('#music-search-program');
                        zoomPics();
                    }, 310);
                })
                .catch((error) => {
                    switchElementContent('#music-search-program', i18n.structureErrorInfo(error));
                });
        }, 1000);
    }
}

// 音乐进度更新
function musicUpdata() {
    changeMusicProgress = (progress) => {
        musicProgressbar.style.width = `${progress}%`;
    };
    changeMusicProgress((music.currentTime / music.duration) * 100);
    document.getElementById('music-time').innerHTML =
        timeTrans(music.currentTime) + '/' + timeTrans(music.duration);
}

// 音乐播放/暂停
function musicPlay() {
    if (music.src == window.location.origin + '/') {
        highlightElement('#music-name');
    } else {
        if (document.querySelector('#music-button').getAttribute('play') !== 'true') {
            document.querySelector('#music-button').setAttribute('play', 'true');
            switchElementContent('#music-button', i18n.structureMusicPause, 200);
            music.play();
        } else {
            document.querySelector('#music-button').setAttribute('play', 'false');
            switchElementContent('#music-button', i18n.structureMusicPlay, 200);
            music.pause();
        }
    }
}

// 音乐前进/后退
function musicGo(second) {
    if (music.currentTime + second <= music.duration && music.currentTime + second >= 0) {
        music.currentTime = music.currentTime + second;
    }
}

// 更改音乐
function musicChange(name, url) {
    if (music.paused == false) {
        musicPlay();
    }
    setTimeout(() => {
        music.src = url;
        music.load();
        switchElementContent('#music-name', name);
        setTimeout(() => {
            if (music.paused == true) {
                musicPlay();
            }
            if (cookie.getItem('settingEnableMusicStateStorage') !== 'false') {
                cookie.setItem('musicPlayingName', name);
                cookie.setItem('musicPlayingSource', url);
            }
            message.switch(i18n.structurePlayingMusic(name));
            setTimeout(() => message.switch(i18n.originMessageBar), 10000);
        }, 100);
    }, 200);
}

// 启动音乐搜索
function musicSetting() {
    if (typeof InfobarRefersher !== 'undefined') {
        clearInterval(InfobarRefersher);
    }
    preload('/music.jpg');
    infoBarMode = 'music';
    switchElementContent('#infobar-left', i18n.structureInfobarMusic);
    setTimeout(() => enableInfobarRefersh());
    if (typeof musicApi == 'undefined') {
        musicApi = config.musicApiList[0];
        if (cookie.getItem('settingEnableApiPrecheck') == 'false') {
            return false;
        }
        config.musicApiList.forEach(function (e) {
            checkURL(
                e,
                () => {
                    musicAvailableApiList.push(e);
                    musicApi = musicAvailableApiList[0];
                },
                () => {
                    //
                },
            );
        });
    }
}

// 启动InfoBar刷新
function enableInfobarRefersh() {
    var runTime = 0;
    var InfobarRefersher = setInterval(function () {
        runTime += 1;
        if (isLayoutInfobarOpen() == false) {
            clearInterval(InfobarRefersher);
            switchElementContent('#infobar-left', '', 100);
        } else {
            switchElementContent('#time', getTime('hh:mm'));
            switchElementContent('#uid', '<hr>' + base.encryption(window.location.href), 500);
            if (infoBarMode == 'info') {
                refreshInfo(runTime);
            }
            if (infoBarMode == 'swap') {
                startSwap(runTime);
            }
            if (infoBarMode == 'share') {
                switchElementContent('#input-area-local', window.location.href, 800);
                switchElementContent(
                    '#input-area-short',
                    window.location.origin + '/?u=' + base.encryption(window.location.pathname),
                    800,
                );
                if (runTime <= 1) {
                    var shareOtherInner = [];
                    for (let i = 0; i < config.trustDomain.length; i++) {
                        shareOtherInner.push(i18n.structureShareInput(i, window.location.pathname));
                    }
                    switchElementContent('#share-other', shareOtherInner, 800);
                }
            }
        }
    }, 500);
}

// 信息刷新
function refreshInfo(runTime) {
    if (runTime == 1) {
        switchElementContent('#page-update-time', document.lastModified);
    }
    if (errorList.length == 0) {
        switchElementContent('#theme-state', '正常');
    } else {
        switchElementContent(
            '#theme-state',
            `<span class="red">发生${errorList.length}个异常</span>`,
        );
    }
    if (window.navigator.onLine) {
        switchElementContent('#network-state', '就绪');
    } else {
        switchElementContent('#network-state', '<span class="red">离线</span>');
    }
    if (cookie.getItem('isCookieReseted') == 'true') {
        switchElementContent('#cookie-state', '已启用');
    } else {
        switchElementContent('#cookie-state', '<span class="yellow">未启用</span>');
    }
    switchElementContent('#up-time', getTime('DD天hh小时mm分钟', config.siteBirthday));
    switchElementContent('#loading-time', cookie.getItem('lastLoadTime'));
    if (config.trustDomain.indexOf(window.location.hostname) == -1) {
        switchElementContent(
            '#alert-info',
            i18n.structureUntrustedDomain(window.location.hostname),
        );
    }
    switchElementContent('#url', window.location.pathname);
    if (cookie.getItem('settingEnableUmamiAnalytics') !== 'false' && runTime == 1) {
        analysis
            .getPageVisitors()
            .then((data) => switchElementContent('#url-visitors', data['pageviews'].value));
    }
    if (runTime == 1) {
        analysis.loadUptime().then((message) => {
            let result = [];
            message.data.forEach((e, index) => {
                result.push(
                    i18n.structureUptime(
                        e.attributes.pronounceable_name,
                        e.attributes.status,
                        e.attributes.url,
                        index + 1,
                    ),
                );
            });
            switchElementContent('#uptime-list', result);
        });
    }
}

// download分发
function download(url, name) {
    fileDownload(url, name);
}

function fileDownload(url, name) {
    if (cookie.getItem('settingEnableDownloadFunction') !== 'false') {
        if (cookie.getItem('settingUseFetchDownload') == 'true') {
            fetchDownload(url, name);
        } else {
            XMLDownload(url, name);
        }
    } else {
        browserDownload(url, name);
    }
}

// XML下载
function XMLDownload(url, name) {
    const startTime = new Date().getTime();
    var onDownloadBarReady = false;

    request = new XMLHttpRequest();
    switchElementContent('#state-bar', i18n.structureDownloadBar);
    message.switch(i18n.structureDownloadMessage);
    request.responseType = 'blob';
    request.open('get', url, true);
    request.send();
    setTimeout(() => {
        onDownloadBarReady = true;
        switchElementContent(
            '#download-origin-url',
            `<span id='copy'><span onclick='copy(\"${url}\","#copy")' class='i ri-file-copy-2-fill'></span></span>`,
        );
    }, 300);

    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            const resourcesURL = window.URL.createObjectURL(this.response);
            const anchor = document.createElement('a');
            anchor.href = resourcesURL;
            anchor.download = name;
            document.body.appendChild(anchor);
            anchor.click();
            setTimeout(() => {
                switchElementContent('#download-state', '已完成');
                message.switch(i18n.structureDownloadCompleteMessage);
            }, 300);
            setTimeout(() => {
                switchElementContent('#state-bar', '');
                switchElementContent('#state-bar', '');
                message.switch('');
            }, 15000);
        }
    };
    request.onerror = function (error) {
        setTimeout(() => {
            switchElementContent('#download-state', '错误');
            message.switch(i18n.structureDownloadErrorMessage);
        }, 300);

        setTimeout(() => {
            switchElementContent('#state-bar', '');
            switchElementContent('#state-bar', '');
            message.switch('<a></a>');
        }, 15000);
    };

    request.onprogress = function (e) {
        const precent_complete = Math.floor((e.loaded / e.total) * 100);
        const duration = (new Date().getTime() - startTime) / 1000;
        const bps = e.loaded / duration;
        const kbps = Math.floor(bps / 1024);
        const time = (e.total - e.loaded) / bps;
        const seconds = Math.floor(time % 60);
        const minutes = Math.floor(time / 60);
        if (onDownloadBarReady == true) {
            switchElementContent(
                '#download-origin-url',
                `<span id='copy'><span onclick='copy(\"${url}\","#copy")' class='i ri-file-copy-2-fill'></span></span>`,
                0,
            );
            switchElementContent('#download-state', '活跃');
            switchElementContent('#download-progress', `${precent_complete}%`, 0);
            switchElementContent('#download-done', formatBytes(e.loaded), 0);
            switchElementContent('#download-total', formatBytes(e.total), 0);
            switchElementContent('#download-speed', `${kbps} KB/S`, 0);
            switchElementContent('#download-time', `${minutes}m${seconds}s`, 0);
        }
    };
}

// byte可读转换
function formatBytes(bytes) {
    if (bytes === 0) {
        return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// URL分析
function analyzeURL(url, target) {
    let urlObj = new URL(url);
    let queryString = urlObj.search;
    if (queryString === '') {
        return '';
    }
    let params = new URLSearchParams(queryString);
    let targetValue = params.get(target);
    if (targetValue === null) {
        return '';
    }
    return targetValue;
}

// 快速设置
function setting(target, value) {
    cookie.setItem('setting' + target, value);
}

// fetch下载
function fetchDownload(url, filename) {
    return fetch(url, {
        headers: new Headers({
            Origin: location.origin,
        }),
        mode: 'cors',
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Fetch error');
            }
            return response.blob();
        })
        .then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch((error) => {
            console.error(error);
        });
}

// 浏览器下载
function browserDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Base64模块
const base = {
    encryption: function (str) {
        return Base64.encode(str);
    },
    decrypt: function (str) {
        return Base64.decode(str);
    },
};

// 速度测试模块
let speedTestResultList = [];
function startSwap(runTimes) {
    var speedTestList = [];
    var speedList = [];
    var max = 0;
    if (runTimes == 1) {
        config.trustDomain.forEach(function (e) {
            speedTestList.push(i18n.structureSwapList(e));
            speedTestResultList.push([0, 0, e]);
        });
        switchElementContent('#speed-test-show', speedTestList);
    }
    if (runTimes > 3 && runTimes < 10) {
        switchElementContent('#speed-test-info', '正在进行速度测试');
        config.trustDomain.forEach((e, index) => {
            var id = e.replaceAll('.', '');
            speedtest('https://' + e + '/assets/images/avatar.jpg', 55.2).then((speed) => {
                if (runTimes <= 10) {
                    switchElementContent('#' + id, Math.round(speed * 100) / 100 + ' KB/s', 100);
                    speedTestResultList[index] = [
                        speedTestResultList[index][0] + speed,
                        speedTestResultList[index][1] + 1,
                        speedTestResultList[index][2],
                    ];
                }
            });
        });
    }
    if (runTimes == 10) {
        switchElementContent('#speed-test-info', '计算平均速度...');
    }
    if (runTimes == 11) {
        speedTestResultList.forEach((e, index) => {
            switchElementContent(
                '#' + e[2].replaceAll('.', ''),
                (Math.round((e[0] / e[1]) * 100) / 100 || 0) + ' KB/s',
            );
            speedList.push(Math.round((e[0] / e[1]) * 100) / 100 || 0);
        });
        max = speedList.reduce((a, b) => Math.max(a, b), 0);
        for (let i = 0; i < speedList.length; i++) {
            if (max == speedList[i]) {
                document.querySelectorAll('.speed-test-result').forEach((e) => {
                    e.parentNode.style.opacity = 0.5;
                    document.querySelector(
                        '#' + speedTestResultList[i][2].replaceAll('.', ''),
                    ).parentNode.style.opacity = 1;
                });

                setTimeout(() => {
                    switchElementContent('#speed-test-info', '准备跳转');
                    window.location.href =
                        'https://' + speedTestResultList[i][2] + window.location.pathname;
                }, 2000);
                break;
            }
        }
    }
}

// 复制
function copy(value, feedbackElement = null) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    if (feedbackElement !== null) {
        switchElementContent(
            feedbackElement,
            "<span class='i ri-check-fill green' class='i ri-file-copy-2-fill'></span>",
        );
    }
}

// 时间转换
function timeTrans(times) {
    var t = '00:00';
    if (times > -1) {
        var hour = Math.floor(times / 3600);
        var min = Math.floor(times / 60) % 60;
        var sec = times % 60;
        t = '';
        if (min < 10) {
            t += '0';
        }
        t += min + ':';
        if (sec < 10) {
            t += '0';
        }
        t += sec.toFixed(2);
        t = t.substring(0, t.length - 3);
    }
    return t;
}

// 图片放大
function zoomPics() {
    if (cookie.getItem('settingEnableImgZoom') == 'false') {
        return false;
    }
    let img;
    document.querySelectorAll('img').forEach((element) => {
        // element.setAttribute('onload', 'this.classList.add(“loaded”)');
    });
    document.querySelectorAll('img').forEach((element) => {
        // element.setAttribute('onerror', 'this.src = "/assets/images/broke.jpg"');
    });
    try {
        img = document.querySelectorAll('img:not(#avatar , #avatarname , .no-zoom)');
    } catch (e) {
        img = document.querySelectorAll('img');
    }

    for (var i = 0; i < img.length; i++) {
        img[i].onclick = function () {
            var div = document.createElement('div');
            var img = document.createElement('img');
            img.className = 'img-fullscreen-out';
            img.src = this.src;
            document.body.appendChild(div);
            div.appendChild(img);
            setTimeout(function () {
                img.className = 'img-fullscreen';
                div.className = 'img-show';
            }, 10);

            img.onclick = function () {
                img.className = 'img-fullscreen-out';
                div.className = 'img-show-out';
            };
            div.onclick = function () {
                img.className = 'img-fullscreen-out';
                div.className = 'img-show-out';
                setTimeout(function () {
                    document.body.removeChild(div);
                }, 500);
            };
        };
    }
}

// URL可用性检查
function checkURL(url, callback, errorback) {
    fetch(url)
        .then((response) => {
            if (response.ok) {
                callback();
            } else {
                errorback();
            }
        })
        .catch((error) => {
            errorback(error);
        });
}

// 主题颜色切换
// TODO
function toggleThemeMode() {
    message.add(
        <a>
            此功能尚在开发&nbsp;<span className='ri-alert-line'></span>
        </a>,
        1500,
    );
}

// 启动加载动画
function loadItems(parentNodeName, mode = 'sort') {
    if (mode == 'sort') {
        for (let j = document.querySelectorAll(parentNodeName + ' .loading').length; j > 0; j--) {
            document
                .querySelectorAll(parentNodeName + ' .loading')
                [j - 1].setAttribute('style', '--i: ' + j);
        }
    }
    document.querySelectorAll(parentNodeName + ' .loading').forEach((e) => {
        e.classList.add('loaded');
    });
}

// 清除加载状态
function loadClear(parentNodeName) {
    document.querySelectorAll(parentNodeName + ' .loaded').forEach((e) => {
        e.classList.remove('loaded');
    });
}

// 下载速度测试
function speedtest(imgUrl, fileSize) {
    return new Promise((resolve, reject) => {
        let start = null;
        let end = null;
        let img = document.createElement('img');
        start = new Date().getTime();
        img.onload = function (e) {
            end = new Date().getTime();
            const speed = (fileSize * 1000) / (end - start);
            resolve(speed);
        };
        img.src = imgUrl + '?' + Math.floor(Math.random() * 2400000);
    }).catch((err) => {
        throw err;
    });
}

// 运行时间测试
function runTime(f) {
    console.time();
    f();
    console.timeEnd();
}

// 导航栏高亮
function highlightNav(name) {
    if (cookie.getItem('settingEnableNavHighlight') == 'false') {
        return false;
    }
    for (let i = 0; i < config.nav.length; i++) {
        if (config.nav[i].link.replaceAll('/', '') == name) {
            document.querySelectorAll('#header-side nav a').forEach((element) => {
                element.classList.remove('active');
            });
            document.querySelector('#' + config.nav[i].id).classList.add('active');
            break;
        }
    }
}

function objectToForm(obj) {
    var formData = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var encodedKey = encodeURIComponent(key);
            var encodedValue = encodeURIComponent(obj[key]);
            formData.push(encodedKey + '=' + encodedValue);
        }
    }
    return formData.join('&');
}

// 账户管理模块
function loadAccount() {
    if (!token.get()) {
        switchElementContent(
            '#user-main',
            <div className='info-warning center'>
                <span className='i_small ri-user-unfollow-line'></span> 尚未登录，部分功能受限
                <br />
                立刻 <a href='/account/signin'>登录</a> 或 <a href='/account/signup'>注册</a>
            </div>,
        );
    } else {
        document.querySelector('#icon-account').href = '/user?uid=' + token.read('uid');
        let refreshTime = token.read('iat') * 1000 + 20 * 60 * 1000 - Date.now();
        if (accountTimer) return;
        accountTimer = setTimeout(() => {
            token.refresh().then(() => {
                loadAccount();
            });
        }, refreshTime);
        switchElementContent(
            '#user-state',
            <div>
                <span>
                    <span className='ri-time-fill'></span> 将于
                    {formatTimeDifference(Date.now() + refreshTime)}后重新刷新TOKEN
                </span>
                <br />
                <span>
                    <span className='ri-lock-password-fill'></span> TOKEN将于
                    {formatTimeDifference(1000 * token.read('exp'))}后失效
                </span>
            </div>,
        );
    }
}

function formatTimeDifference(timestamp) {
    const now = new Date();
    const futureDate = new Date(timestamp);

    let diffInSeconds = Math.floor((futureDate - now) / 1000);

    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);

    let result = '';

    if (days > 0) {
        result += `${days}天`;
    }
    if (hours > 0) {
        result += `${hours}小时`;
    }
    if (minutes > 0) {
        result += `${minutes}分`;
    }
    if (!result) {
        return '一分钟';
    }

    return result;
}

function loginWithPassword(username, password, expiredTime = '7d') {
    fetch(platformUrl + 'api/signin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: objectToForm({
            account: username,
            password: password,
            expiredTime: expiredTime,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            if (data.code == 200) {
                cookie.setItem('usertoken', data.inner.token);
            } else {
                console.log(data.message);
            }
        });
}

function openUserbar(mode) {}

async function virgule(element, text, interval) {
    let vir = (await import('virgule-js')).default;
    let targetList = vir(text);
    let doneTime = 0;
    let virguleTimer = setInterval(() => {
        doneTime++;
        element.innerHTML = targetList[doneTime - 1];
        if (doneTime == targetList.length) {
            clearInterval(virguleTimer);
        }
    }, interval);
}

// 页面初始化
function loadPageType() {
    let pageType = window.location.pathname.split('/')[1];
    highlightNav(pageType);
    loadItems('#main', '');

    switch (pageType) {
        case '': // home
            virgule(document.querySelector('#jumping'), '## ' + config.siteHelloWords, 20);
            break;
        case 'posts':
            display.resetTagList();
            if (document.querySelector('#index-info')) {
                virgule(
                    document.querySelector('#index-info'),
                    document.querySelector('#index-info').innerText +
                        `最近更新于${getTime('DD', document.querySelector('time').innerHTML)}天前`,
                    20,
                );
            }
            if (window.location.pathname.split('/')[2]) {
                // 显示目录
                i18n.originMessageBar = (
                    <a onClick={() => openInfoBar('menu')}>
                        目录&nbsp;<span class='i ri-list-unordered'></span>
                    </a>
                );
                message.switch(i18n.originMessageBar);
                if (cookie.getItem('settingEnableUmamiAnalytics') !== 'false') {
                    analysis.getPageVisitors().then((data) => {
                        switchElementContent('#pageVisitors', data['pageviews'].value);
                    });
                }
                zoomPics();
            }
            break;
        case '404page':
            // code
            break;
        case 'friends':
            highlightNav('friends');
            reorder('#friends-link-box', '.friends-link-item', 0);
            i18n.originMessageBar = `<a onclick="reorder('#friends-link-box','.friends-link-item',300);zoomPics()">重新随机排序&nbsp;<span class="i ri-refresh-line"></span></a>`;
            message.add(i18n.originMessageBar, 0);
            zoomPics();
            loadComment();
            codeHighlight();
            break;
        case 'works-index':
            document.querySelector('#showarea').classList.add('loaded');
            break;
        case 'about':
            switchElementContent('#uptime2', getTime('DD', config.siteBirthday), 0);
            break;
        case 'articles-index':
            break;
    }
    checkPageHash();
}

// 检查页面锚点
let isHashWorking = false;
function checkPageHash() {
    if (isHashWorking !== false) {
        return false;
    }
    isHashWorking = true;
    if (cookie.getItem('settingEnableHashCheck') == 'false') {
        return false;
    }
    let hash = window.location.hash;
    if (hash.startsWith('#/tag/') || hash.startsWith('#/classification/')) {
        articlesFilter();
    }
    setTimeout(() => {
        if (isHashWorking == false) {
            return false;
        }
        window.location.hash = '';
        window.location.hash = hash;
        setTimeout(() => {
            isHashWorking = false;
        }, 1);
    }, 0);
}

const globalModule = {
    isLayoutMenuOpen,
    openInfoBar,
    toggleThemeMode,
    toggleFullScreen,
    musicChange,
    musicGo,
    musicPlay,
    musicSetting,
    openUserbar,
    copy,
    musicSearch,
    musicUpdata,
    setting,
    toggleLayoutUserbar,
};

export default globalModule;
