// RTheme v3 - main

// 标记元素
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
}

// 刷新Cookie状态
function resetCookies() {
    if (docCookies.hasItem('isCookieReseted') == false) {
        docCookies.setItem('isCookieReseted', true);
    }
}

// 右菜单开关
function toggleLayoutMenu() {
    domMenuToggle.classList.toggle('active');
    domBody.classList.toggle('active');
    domShadeContext.classList.toggle('active');
    if (isLayoutMenuOpen()) {
        currentInfoBarInner = getElementInnerhtml('#message-bar');
        if (
            docCookies.getItem('settingEnableUmamiAnalytics') !== 'false' &&
            docCookies.getItem('settingEnableUmamiEvents') !== 'false'
        ) {
            getRealTimeVisitors('switch');
        }
    } else {
        if (typeof currentInfoBarInner !== 'undefined') {
            switchMessageBarContent(currentInfoBarInner);
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
    if (getElementInnerhtml('#userbar') == '') {
        quickSwitchElementContent('#userbar', structureLayoutUserbar());
    }
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

// 切换元素内容
function switchElementContent(selector, context, time = 300) {
    if (time == 0) {
        quickSwitchElementContent(selector, context);
    } else {
        if (typeof selector == 'object') {
            var element = selector;
        } else {
            var element = document.querySelector(selector);
            if (element == null) {
                throw 'Unable to obtain target DOM element';
            }
        }
        if (element !== null) {
            if (element.innerHTML !== context) {
                element.style.opacity = '1';
                element.style.transition = 'opacity ' + time + 'ms';
                element.style.opacity = '0';
                setTimeout(function () {
                    element.innerHTML = context;
                    element.style.opacity = '1';
                }, time);
            }
        }
    }
}

// 快切
function quickSwitchElementContent(selector, context) {
    const element = document.querySelector(selector);
    element.innerHTML = context;
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

// messagebar切换
function switchMessageBarContent(context, time = 300) {
    switchElementContent('#message-bar', context, time);
}

let messageBarQueue = [];
let messageBarState = 'offdisplay';

// 添加消息队列
function addMessageBarQueue(context, lastTime, TransTime = 300) {
    if (docCookies.getItem('settingEnableMessage') == 'false') {
        return false;
    }
    if (messageBarQueue.includes([context, lastTime, TransTime])) {
        return false;
    } else {
        messageBarQueue.push([context, lastTime, TransTime]);
    }
    if (messageBarState == 'offdisplay') {
        messageBarState = 'ondisplay';
        enableMessageBarQueue();
    }
}
// 处理消息队列
function enableMessageBarQueue() {
    if (messageBarQueue.length === 0) {
        messageBarState = 'offdisplay';
        switchMessageBarContent(originMessageBar);
    } else {
        switchMessageBarContent(messageBarQueue[0][0], messageBarQueue[0][2]);
        setTimeout(() => {
            messageBarQueue.shift();
            enableMessageBarQueue();
        }, messageBarQueue[0][1]);
    }
}

// 延时，搭配asymc wait使用
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 页面主题切换
function switchPageContent(selector, news, time = 450) {
    const element = document.querySelector(selector);
    element.style.opacity = '1';
    // element.style.left = '0'
    element.style.transition = `opacity ${time}ms,left ${time}ms`;
    element.style.opacity = '0';
    // element.style.left = '-60%'
    news.style.opacity = '0';
    // news.style.left = '-60%'
    news.style.transition = `opacity ${time}ms,left ${time}ms`;
    setTimeout(function () {
        element.outerHTML = news.outerHTML;
        document.querySelector(selector).style.transition = `opacity ${time}ms,left ${time}ms`;
        setTimeout(function () {
            document.querySelector(selector).style.opacity = '1';
            // document.querySelector(selector).style.left = '0';
        }, 50);
    }, 300);
}

// 获取元素InnerHTML
function getElementInnerhtml(selector) {
    element = document.querySelector(selector) || undefined;
    if (typeof element !== 'undefined') {
        return element.innerHTML;
    } else {
        return null;
    }
}

// 随机数
function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 三态进度条
// 进度调整
function changeProgress(progress) {
    if (progressState == 'success') {
        return false;
    }
    if (progress <= progressNum) {
        // fullProgressBar();
        return false;
    }
    let progressBar = document.querySelector('#progress');
    if (progress >= 99) {
        progressBar.style.width = `100%`;
        progressNum = 100;
    } else {
        progressBar.style.width = `${progress}%`;
        progressNum = progress;
    }
}

// 显示进度条
function showProgressBar() {
    progressNum = 0;
    switchElementContent('#icons-left', structurePrograssBar);
    setTimeout(function () {
        progressbar = document.querySelector('#progress');
        profather = document.querySelector('#progress-container');
        progressAdd = setInterval(function () {
            if (progressAdd >= 10 && progressState == 'sending') {
                if (progressNum >= 85 || progressState == 'success') {
                    clearInterval(progressAdd);
                    return false;
                }
                if (progressNum >= 70) {
                    progressbar.classList.add('yellow');
                    changeProgress(progressNum + getRandomInteger(0, 2));
                } else {
                    changeProgress(progressNum + getRandomInteger(0, 10));
                }
            }
        }, 500);
        setTimeout(function () {
            if (progressState == 'sending') {
                changeProgress(getRandomInteger(5, 15), progressbar);
            }
        }, 400);
        setTimeout(function () {
            if (progressState == 'sending') {
                changeProgress(progressNum + getRandomInteger(10, 25), progressbar);
            }
        }, 500);
    }, 301);
}

// 显示错误进度条
function onErrorProgressBar() {
    setTimeout(function () {
        clearInterval(progressAdd);
        progressbar.classList.add('red');
        changeProgress(100);
        closeErrorBar = setTimeout(function () {
            if (getElementInnerhtml('#icons-left') !== originIconsLeftContext) {
                closeProgressBar();
            }
        }, 2000);
    }, 310);
}

// 关闭进度条
function closeProgressBar() {
    if (progressbar.classList[0] == 'yellow') {
        progressbar.classList.toggle('yellow');
    }
    if (getElementInnerhtml('#icons-left') !== originIconsLeftContext) {
        switchElementContent('#icons-left', originIconsLeftContext, 300);
    }
}

// 进度拉满
function fullProgressBar() {
    setTimeout(() => {
        clearInterval(progressAdd);
        setTimeout(() => {
            changeProgress(100);
        }, 50);
    }, 300);
    setTimeout(() => closeProgressBar(), 1000);
}

// 初始化监听器
function addListeners() {
    addEventListener('copy', (event) => {
        addMessageBarQueue('<a>已复制 &nbsp;<span class="i ri:file-copy-2-line"></span></a>', 2000);
    });
    addEventListener('cut', (event) => {
        addMessageBarQueue(
            '<a>已剪切 &nbsp;<span class="i ri:scissors-cut-line"></span></a>',
            2000,
        );
    });
    addEventListener('paste', (event) => {
        addMessageBarQueue('<a>已粘贴 &nbsp;<span class="i ri:chat-check-line"></span></a>', 2000);
    });
    window.addEventListener(
        'hashchange',
        function () {
            checkPageHash();
        },
        false,
    );
    addEventListener('offline', (event) => {
        addMessageBarQueue(
            '<a>互联网连接已断开 <span class="i ri:cloud-off-line"></span></a>',
            5000,
        );
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
    document.addEventListener('pjax:send', () => {
        pjaxLoadSend();
    });
    document.addEventListener('pjax:complete', () => {
        pjaxLoadComplete();
    });
    document.addEventListener('pjax:error', () => {
        pjaxLoadError();
    });
    document.addEventListener('pjax:success', () => {
        pjaxLoadSuccess();
    });
}

// 退出检测
window.onbeforeunload = function () {
    beforeLeaveContent = getElementInnerhtml('#viewmap');
    switchMessageBarContent(structureLeaveMessage);
};

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

// PJAX模块
// 启用pjax
function enablePjax() {
    if (docCookies.getItem('settingEnablePjaxLoad') == 'false') {
        return false;
    }
    if (docCookies.getItem('settingEnablePjaxDebug') == 'true') {
        pjax = new Pjax({
            selectors: [
                'title',
                'meta[name=description]',
                'meta[name=keywords]',
                'meta[name=pagetype]',
                'link[rel=canonical]',
                '#viewmap',
                '#page-js',
                '#page-prefetch',
            ],
            cacheBust: false,
            analytics: false,
            scrollRestoration: false,
            debug: true,
            switches: {
                '#viewmap': function (oldEl, newEl) {
                    setTimeout(() => switchPageContent('#viewmap', newEl), 305);
                    setTimeout(() => fullProgressBar(), 50);
                    setTimeout(() => this.onSwitch(), 610);
                },
            },
        });
    } else {
        pjax = new Pjax({
            selectors: ['title', 'meta[name=pagetype]', '#viewmap', '#page-js', '#page-prefetch'],
            cacheBust: false,
            debug: false,
            analytics: false,
            scrollRestoration: false,
            switches: {
                '#viewmap': function (oldEl, newEl) {
                    setTimeout(() => switchPageContent('#viewmap', newEl), 300);
                    setTimeout(() => fullProgressBar(), 50);
                    setTimeout(() => (progressState = 'success'), 610);
                    setTimeout(() => this.onSwitch(), 610);
                    setTimeout(() => {
                        main();
                        loadPageType();
                    }, 660);
                    setTimeout(() => pjax.refresh(), 700);
                },
            },
        });
    }
}

// PJAX触发
function pjaxLoadSend() {
    progressState = 'sending';
    originMessageBar = '';
    addMessageBarQueue(originMessageBar, 0);
    if (isLayoutMenuOpen() == true) {
        toggleLayoutMenu();
    }
    if (typeof closeErrorBar !== 'undefined') {
        clearTimeout(closeErrorBar);
    }
    hiddenPageContent();
    showProgressBar();
}

// PJAX成功
function pjaxLoadSuccess() {
    progressState = 'success';
    progressNum = 99;
    setTimeout(() => {
        zoomPics();
    }, 300);
}

// PJAX失败
function pjaxLoadError() {
    progressState = 'error';
    onErrorProgressBar();
    switchElementContent('#viewmap', structureErrorViewmap, 500);
}

// PJAX结束
function pjaxLoadComplete() {
    progressState = 'done';
    refershPageJs();
    pjax.refresh();
    highlightNav('');
}

// 使用PJAX加载
function pjaxLoad(url) {
    pjax.loadUrl(url);
}

// 页面JS重刷新
function refershPageJs() {
    document.querySelectorAll('script[page-js], #page-js script').forEach(function (element) {
        var id = element.id || '';
        var src = element.src || '';
        var code = element.text || element.textContent || element.innerHTML || '';
        var parent = element.parentNode;
        var script = document.createElement('script');

        parent.removeChild(element);

        if (id !== '') {
            script.id = element.id;
        }

        if (src !== '') {
            script.src = src;
            script.async = false;
        }

        if (code !== '') {
            script.appendChild(document.createTextNode(code));
        }

        parent.appendChild(script);
    });
}

// HTML编解码模块
function HTMLEncode(str) {
    var s = '';
    if (str.length == 0) return '';
    s = str.replace(/&/g, '&amp;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/ /g, '&nbsp;');
    s = s.replace(/\'/g, '&#39;');
    s = s.replace(/\"/g, '&quot;');
    s = s.replace(/\n/g, '<br/>');
    return s;
}

function HTMLDecode(str) {
    var s = '';
    if (str.length == 0) return '';
    s = str.replace(/&amp;/g, '&');
    s = s.replace(/&lt;/g, '<');
    s = s.replace(/&gt;/g, '>');
    s = s.replace(/&nbsp;/g, ' ');
    s = s.replace(/&#39;/g, "'");
    s = s.replace(/&quot;/g, '"');
    s = s.replace(/<br\/>/g, '\n');
    return s;
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

// InfoBar功能分发
function openInfoBar(mode) {
    infoBarMode = mode || '';
    switch (mode) {
        case 'info':
            switchElementContent('#infobar-left', structureInfobarInfo(), 0);
            break;
        case 'music':
            musicSetting();
            preload('/assets/images/music.jpg');
            break;
        case 'menu':
            switchElementContent('#infobar-left', updateMenu(), 0);
            setTimeout(() => {
                highlightMenu();
                document
                    .querySelector('#articles-menu')
                    .setAttribute('onclick', 'setTimeout(()=>highlightMenu(),1000)');
            }, 10);
            break;
        case 'setting':
            switchElementContent('#infobar-left', structureInfobarSetting, 0);
            var settingItems = valueSettingItems();
            var settingStrs = '';
            settingItems.forEach(function (item) {
                if (item.length == 4) {
                    settingStrs += structureSetting(item[0], item[1], item[2], item[3]);
                } else {
                    settingStrs += structureSetting(item[0], item[1], item[2]);
                }
            });
            setTimeout(() => switchElementContent('#setting-list', settingStrs, 300), 300);
            setTimeout(() => loadItems('#setting-list'), 700);
            break;
        case 'swap':
            switchElementContent('#infobar-left', structureInfobarSwap, 0);
            break;
        case 'share':
            switchElementContent('#infobar-left', structureInfobarShare(), 0);
            break;
        case 'articles-sort':
            switchElementContent('#infobar-left', structureInfobarSort(), 0);
            break;
        case 'feed':
            switchElementContent('#infobar-left', structureInfobarFeed(), 0);
    }
    switchElementContent('#infobar-title', mode, 300);
    toggleLayoutInfobar();
}

// 音乐搜索
function musicSearch(name) {
    if (name !== '') {
        switchElementContent('#music-search-program', structureSquareLoading);
        if (typeof searchTimer !== 'undefined') {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(function () {
            fetch(musicApi + name)
                .then((response) => response.json())
                .then((data) => {
                    var musicSearchResult = '';
                    for (let i = 0; i < data['result']['songs'].length; i++) {
                        var artists = '';
                        for (let j = 0; j < data['result']['songs'][i]['ar'].length; j++) {
                            artists = artists + data['result']['songs'][i]['ar'][j]['name'] + '/';
                        }
                        artists = artists.substring(0, artists.length - 1);
                        musicSearchResult += getstructureMusicSearchResult(
                            data['result']['songs'][i]['name'],
                            'http://music.163.com/song/media/outer/url?id=' +
                                data['result']['songs'][i]['id'] +
                                '.mp3',
                            artists,
                            data['result']['songs'][i]['al']['picUrl'],
                            data['result']['songs'][i]['al']['name'],
                        );
                    }
                    switchElementContent('#music-search-program', musicSearchResult, 200);
                    setTimeout(() => {
                        loadItems('#music-search-program');
                        zoomPics();
                    }, 310);
                })
                .catch((error) => {
                    switchElementContent('#music-search-program', structureErrorInfo(error));
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
        if (getElementInnerhtml('#music-button') == structureMusicPlay) {
            switchElementContent('#music-button', structureMusicPause, 200);
            music.play();
        } else {
            switchElementContent('#music-button', structureMusicPlay, 200);
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
            if (docCookies.getItem('settingEnableMusicStateStorage') !== 'false') {
                docCookies.setItem('musicPlayingName', name);
                docCookies.setItem('musicPlayingSource', url);
            }
            switchMessageBarContent(structurePlayingMusic(name));
            setTimeout(() => switchMessageBarContent(originMessageBar), 10000);
        }, 100);
    }, 200);
}

// 启动音乐搜索
function musicSetting() {
    if (typeof InfobarRefersher !== 'undefined') {
        clearInterval(InfobarRefersher);
    }
    preload('/assets/images/music.jpg');
    infoBarMode = 'music';
    switchElementContent('#infobar-left', structureInfobarMusic);
    setTimeout(() => enableInfobarRefersh());
    if (typeof musicApi == 'undefined') {
        musicApi = musicApiList[0];
        if (docCookies.getItem('settingEnableApiPrecheck') == 'false') {
            return false;
        }
        musicApiList.forEach(function (e) {
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
                    var shareOtherInner = '';
                    for (let i = 0; i < trustDomain.length; i++) {
                        shareOtherInner += structureShareInput(i, window.location.pathname);
                    }
                    switchElementContent('#share-other', shareOtherInner, 800);
                }
            }
        }
    }, 500);
}

// 信息刷新
function refreshInfo(runTime) {
    switchElementContent('#page-update-time', document.lastModified);
    if (errorList.length == 0) {
        switchElementContent('#theme-state', '正常');
    } else {
        switchElementContent(
            '#theme-state',
            `<span class="red">发生${errorList.length}个异常</span>`,
        );
    }
    if (typeof pjax == 'undefined') {
        switchElementContent('#pjax-state', '<span class="red">离线</span>');
    } else {
        switchElementContent('#pjax-state', '就绪');
    }
    if (window.navigator.onLine) {
        switchElementContent('#network-state', '就绪');
    } else {
        switchElementContent('#network-state', '<span class="red">离线</span>');
    }
    if (docCookies.getItem('isCookieReseted') == 'true') {
        switchElementContent('#cookie-state', '已启用');
    } else {
        switchElementContent('#cookie-state', '<span class="yellow">未启用</span>');
    }
    switchElementContent('#up-time', getTime('DD天mm分钟', '${siteStartTime}'));
    switchElementContent('#loading-time', docCookies.getItem('lastLoadTime'));
    if (trustDomain.indexOf(window.location.hostname) == -1) {
        switchElementContent(
            '#alert-info',
            structureUntrustedDomainOne + window.location.hostname + structureUntrustedDomainTwo,
        );
    }
    switchElementContent('#url', window.location.pathname);
    /* 接入Umami
    if (docCookies.getItem('settingEnableUmamiAnalytics') !== 'false' && runTime == 1) {
        getPageVisitors().then((data) =>
            switchElementContent('#url-visitors', data['pageviews'].value),
        );
    }
    */
    /* 接入Uptime模块
    if (runTime == 1) {
        loadUptime().then((message) => {
            let str = '';
            message.data.forEach((e) => {
                str += structureUptime(
                    e.attributes.pronounceable_name,
                    e.attributes.status,
                    e.attributes.url,
                );
            });
            switchElementContent('#uptime-list', str);
        });
    }
    */
}

// download分发
function download(url, name) {
    fileDownload(url, name);
}

function fileDownload(url, name) {
    if (docCookies.getItem('settingEnableDownloadFunction') !== 'false') {
        if (docCookies.getItem('settingUseFetchDownload') == 'true') {
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
    switchElementContent('#state-bar', structureDownloadBar);
    switchMessageBarContent(structureDownloadMessage);
    request.responseType = 'blob';
    request.open('get', url, true);
    request.send();
    setTimeout(() => {
        onDownloadBarReady = true;
        switchElementContent(
            '#download-origin-url',
            `<span id='copy'><span onclick='copy(\"${url}\","#copy")' class='i ri:file-copy-2-fill'></span></span>`,
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
                switchMessageBarContent(structureDownloadCompleteMessage);
            }, 300);
            setTimeout(() => {
                switchElementContent('#state-bar', '');
                switchElementContent('#state-bar', '');
                switchMessageBarContent('');
            }, 15000);
        }
    };
    request.onerror = function (error) {
        setTimeout(() => {
            switchElementContent('#download-state', '错误');
            switchMessageBarContent(structureDownloadErrorMessage);
        }, 300);

        setTimeout(() => {
            switchElementContent('#state-bar', '');
            switchElementContent('#state-bar', '');
            switchMessageBarContent('');
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
                `<span id='copy'><span onclick='copy(\"${url}\","#copy")' class='i ri:file-copy-2-fill'></span></span>`,
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
    docCookies.setItem('setting' + target, value);
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
        let result = '';
        let i = 0;
        while (i < str.length) {
            let num1 = str.charCodeAt(i++);
            let num2 = str.charCodeAt(i++);
            let num3 = str.charCodeAt(i++);
            const bits = (num1 << 16) | (num2 << 8) | num3;
            const b1 = (bits >> 18) & 0x3f;
            const b2 = (bits >> 12) & 0x3f;
            const b3 = (bits >> 6) & 0x3f;
            const b4 = bits & 0x3f;
            result += baseStr[b1] + baseStr[b2] + baseStr[b3] + baseStr[b4];
        }
        return result;
    },
    decrypt: function (str) {
        let result = '';
        let i = 0;
        while (i < str.length) {
            const b1 = baseStr.indexOf(str[i++]);
            const b2 = baseStr.indexOf(str[i++]);
            const b3 = baseStr.indexOf(str[i++]);
            const b4 = baseStr.indexOf(str[i++]);
            const bits = (b1 << 18) | (b2 << 12) | (b3 << 6) | b4;
            const num1 = (bits >> 16) & 0xff;
            const num2 = (bits >> 8) & 0xff;
            const num3 = bits & 0xff;
            if (b3 === 64) {
                result += String.fromCharCode(num1);
            } else if (b4 === 64) {
                result += String.fromCharCode(num1, num2);
            } else {
                result += String.fromCharCode(num1, num2, num3);
            }
        }
        return result;
    },
};

// 速度测试模块
speedTestResultList = [];
function startSwap(runTimes) {
    var speedTestList = '';
    var speedList = [];
    var max = 0;
    if (runTimes == 1) {
        trustDomain.forEach(function (e) {
            speedTestList += structureSwapList(e);
            speedTestResultList.push([0, 0, e]);
        });
        switchElementContent('#speed-test-show', speedTestList);
    }
    if (runTimes > 3 && runTimes < 10) {
        switchElementContent('#speed-test-info', '正在进行速度测试');
        trustDomain.forEach((e, index) => {
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
            "<span class='i ri:check-fill green' class='i ri:file-copy-2-fill'></span>",
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
    if (docCookies.getItem('settingEnableImgZoom') == 'false') {
        return false;
    }
    let img;
    document.querySelectorAll('img').forEach((element) => {
        element.setAttribute('onload', 'imgLoad(this)');
    });
    document.querySelectorAll('img').forEach((element) => {
        element.setAttribute('onerror', 'imgError(this)');
    });
    try {
        img = document.querySelectorAll('img:not(#avatar , #avatarname , .no-zoom)');
    } catch (e) {
        console.log(`不支持的浏览器版本。已尝试回退，错误:${e}`);
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
    addMessageBarQueue('<a>此功能尚在开发&nbsp;<span class="i ri:alert-line"></span></a>', 1500);
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

// 检测宽度超出
function isEllipsisActive(e) {
    return e.offsetWidth < e.scrollWidth;
}

// 导航栏高亮
function highlightNav(name) {
    if (docCookies.getItem('settingEnableNavHighlight') == 'false') {
        return false;
    }
    document.querySelectorAll('#header-side nav a').forEach((element) => {
        element.classList.remove('active');
        if (element.innerText.toLowerCase() == name.toLowerCase()) {
            element.classList.add('active');
        }
    });
}

// 账户管理模块
function loadAccount() {
    if (docCookies.getItem('userInfo') == null) {
        switchElementContent(
            '#user-main',
            `<div class="info-warning center"><span class="i_small ri:user-unfollow-line"></span> 尚未登录，部分功能受限<br>立刻 <a onclick="pjaxLoad('/user/login')">登录</a> 或 <a onclick="pjaxLoad('/user/register')">注册</a></div>`,
        );
    }
}

function getAccountInfo(token) {}

function accountLoginIn(username, password, expireTime) {}

function openUserbar(mode) {}

// 页面类型分发
function loadPageType() {
    var pageMoudle = document.querySelector('meta[name=pagetype]').getAttribute('content');
    switch (pageMoudle) {
        case 'homepage':
            highlightNav('home');
            // code
            break;
        case '404page':
            // code
            break;
        case 'friends':
            highlightNav('friends');
            reorder('#friends-link-box', '.friends-link-item', 0);
            originMessageBar = `<a onclick="reorder('#friends-link-box','.friends-link-item',300);zoomPics()">重新随机排序&nbsp;<span class="i ri:refresh-line"></span></a>`;
            addMessageBarQueue(originMessageBar, 0);
            zoomPics();
            loadComment();
            codeHighlight();
            break;
        case 'works-index':
            document.querySelector('#showarea').classList.add('loaded');
            highlightNav('works');
            break;
        case 'about':
            highlightNav('about');
            break;
        case 'articles-index':
            originMessageBar = `<a onclick='openInfoBar("articles-sort")'>更改排序方式&nbsp;<span class="i ri:bar-chart-horizontal-line"></span></a>`;
            addMessageBarQueue(originMessageBar, 0);
            document.querySelectorAll('time').forEach((element) => {
                element.setAttribute('onclick', 'switchTimeDisplay(this)');
            });
            document.querySelector('#showarea').classList.add('loaded');
            resetFilter();
            setTimeout(() => checkPageHash());
            highlightNav('articles');
            break;
        case 'articles-context':
            highlightNav('articles');
            resetImage();
            switchElementContent(
                '#textLength',
                document.querySelector('#articles-body').innerText.length + '字',
            );
            loadComment();
            codeHighlight();
            updateTitle();
            resetFilter();
            originMessageBar = `<a onclick='openInfoBar("menu")'>目录&nbsp;<span class="i ri:list-unordered"></span></a>`;
            addMessageBarQueue(originMessageBar, 0);
            if (docCookies.getItem('settingEnableUmamiAnalytics') !== 'false') {
                getPageVisitors().then((data) => {
                    switchElementContent('#pageVisitors', data['pageviews'].value);
                });
            }
            document.querySelectorAll('time').forEach((element) => {
                element.setAttribute('onclick', 'switchTimeDisplay(this)');
            });
            loadBox();
            zoomPics();
            prefetchImg();
            getSearchData().then(() =>
                switchElementContent(
                    '#more-articles',
                    loadMoreArticles(
                        document.querySelector('#articles-header h1 a').getAttribute('href'),
                    ),
                ),
            );
            switchElementContent(
                '#blockchain-data',
                `<br><hr><div class='center barcode page-id'>${base.encryption(
                    window.location.pathname,
                )}</div>`,
            );
            break;
    }
    checkPageHash();
}

// 错误消息推送
function showError(text) {
    addMessageBarQueue(
        `<a class="red"><strong>错误:${text}</strong>&nbsp;<span class="i ri:alert-line"></span></a>`,
        6000,
    );
}

// 检查页面锚点
isHashWorking = false
function checkPageHash() {
    if (isHashWorking !== false) {
        return false
    }
    isHashWorking = true
    if (docCookies.getItem('settingEnableHashCheck') == 'false') {
        return false;
    }
    let hash = window.location.hash;
    if (hash.startsWith('#/tag/') || hash.startsWith('#/classification/')) {
        articlesFilter();
    }
    setTimeout(()=> {
        if (isHashWorking == false) {
            return false
        }
        window.location.hash = ''
        window.location.hash = hash
        setTimeout(()=>{
             isHashWorking = false
        },1)
    },
    0)
}
