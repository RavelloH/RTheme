// RTheme v4 Global Javascript
import cookie from './lib/cookie.js';
import analysis from './analysis.js';
import i18n from './i18n.jsx';
import { Base64 } from 'js-base64';
import config from '../../../config.js';
import switchElementContent from '../../utils/switchElement.js';
import display from './display.js';
import message from '@/utils/message.js';
import loadURL from '@/utils/loadURL.js';

// 全局声明
let domMenuToggle,
    domShadeGlobal,
    domLayoutInfoBar,
    domInfoBarToggle,
    musicProgressbar,
    musicProfather,
    infoBarMode,
    domLoadShade,
    musicApi,
    searchTimer,
    changeMusicProgress;

const isBrowser = () => typeof window !== 'undefined';

function resetElements() {
    domMenuToggle = document.querySelector('#toggle');
    domShadeGlobal = document.querySelector('#shade-global');
    domLayoutInfoBar = document.querySelector('#infobar');
    domInfoBarToggle = document.querySelector('#infobar-toggle');
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
    analysis.umamiAnalytics();
    if (analyzeURL(window.location.href, 'u') !== '') {
        loadURL(base.decrypt(analyzeURL(window.location.href, 'u')));
    }
    message.switch('', 450);

    if (
        window &&
        performance.navigation.type == 0 &&
        document.referrer.startsWith(window.location.origin)
    ) {
        firstLoad();
        loadPageType();
    } else {
        setTimeout(function () {
            setTimeout(function () {
                setTimeout(() => {
                    loadPageType();
                }, 0);
                firstLoad();
            }, 500);
        }, 600);
    }
}

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
    // window.onerror = function (msg, url, lineNo, columnNo, error) {
    //     var string = msg.toLowerCase();
    //     var substring = 'script error';
    //     if (string.indexOf(substring) > -1) {
    //         alert('错误：侦测到脚本错误，无法初始化页面');
    //     } else {
    //         let message = `
    //     <hr>
    //     <div class='center'>
    //     <h2>初始化异常</h2>
    //     <h3>LOAD<span id='loading-text'><span class="red-text"> Failed.</span></span></h3>
    //     <p><strong>消息: </strong>${msg}<p>
    //     <p><strong>URL: </strong>${url}<p>
    //     <p><strong>行号: </strong>${lineNo}<p>
    //     <p><strong>列数: </strong>${columnNo}<p>
    //     <p><strong>类型: </strong>${JSON.stringify(error)}<p>
    //     </div>
    //     <hr>
    //     <br>
    //     `;
    //         document.querySelector('#load-content').innerHTML = message;
    //         errorList.push(JSON.stringify(error));
    //     }
    //     return false;
    // };
}

// 下拉栏开关
function toggleLayoutInfobar() {
    domLayoutInfoBar.classList.toggle('active');
    domShadeGlobal.classList.toggle('active');
    setTimeout(() => enableInfobarRefersh(), 0);
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
    // window.addEventListener(
    //     'hashchange',
    //     function () {
    //         checkPageHash();
    //     },
    //     false,
    // );
    addEventListener('offline', (event) => {
        message.add('<a>互联网连接已断开 <span class="i ri-cloud-off-line"></span></a>', 5000);
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
    menuStructure += `<br><span class='t1 center'>${
        document.querySelector('h1').innerHTML
    }</span><hr>`;
    let titleSet = document.querySelectorAll(
        '#articles-header h2 , #articles-body h2 , #articles-body h3 , #articles-body h4 , #articles-body h5 , #articles-body h6',
    );

    let counters = { h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };

    titleSet.forEach((element) => {
        let tagName = element.tagName.toLowerCase();
        counters[tagName]++;

        // Reset lower level counters
        if (tagName === 'h2') {
            counters.h3 = counters.h4 = counters.h5 = counters.h6 = 0;
        } else if (tagName === 'h3') {
            counters.h4 = counters.h5 = counters.h6 = 0;
        } else if (tagName === 'h4') {
            counters.h5 = counters.h6 = 0;
        } else if (tagName === 'h5') {
            counters.h6 = 0;
        }

        let numbering = '';
        if (tagName === 'h2') {
            numbering = `${counters.h2}`;
        } else if (tagName === 'h3') {
            numbering = `${counters.h2}.${counters.h3}`;
        } else if (tagName === 'h4') {
            numbering = `${counters.h2}.${counters.h3}.${counters.h4}`;
        } else if (tagName === 'h5') {
            numbering = `${counters.h2}.${counters.h3}.${counters.h4}.${counters.h5}`;
        } else if (tagName === 'h6') {
            numbering = `${counters.h2}.${counters.h3}.${counters.h4}.${counters.h5}.${counters.h6}`;
        }

        let indent = '';
        if (tagName === 'h3') {
            indent = '20px';
        } else if (tagName === 'h4') {
            indent = '40px';
        } else if (tagName === 'h5') {
            indent = '60px';
        } else if (tagName === 'h6') {
            indent = '80px';
        }

        menuStructure += `<span class='${tagName}' style='margin-left: ${indent};'>${numbering} ${element.innerHTML}</span><br>`;
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
    return;
    infoBarMode = mode || '';
    switch (mode) {
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

// 页面初始化
function loadPageType() {
    let pageType = window.location.pathname.split('/')[1];
    switch (pageType) {
        case 'friends':
            highlightNav('friends');
            reorder('#friends-link-box', '.friends-link-item', 0);
            i18n.originMessageBar = `<a onclick="reorder('#friends-link-box','.friends-link-item',300);zoomPics()">重新随机排序&nbsp;<span class="i ri-refresh-line"></span></a>`;
            message.add(i18n.originMessageBar, 0);
            loadComment();
            codeHighlight();
            break;
    }
    checkPageHash();
}

// 检查页面锚点
let isHashWorking = false;
function checkPageHash() {}

const globalModule = {
    isLayoutMenuOpen,
    openInfoBar,
    toggleThemeMode,
    toggleFullScreen,
    copy,
    setting,
};

export default globalModule;
