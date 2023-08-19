// RTheme v3 - loading.js(预加载器)

// 资源列表
loadResources = ['script.js', 'i18n.js', 'pjax.js', 'moudle.js', 'display.js'];
loadingResources = [];
errorList = [];
domLoadShade = document.querySelector('#load-shade');
trustDomain = [
    '${siteDomain}'
];
musicApiList = ['https://music.api.ravelloh.top/cloudsearch?keywords='];
musicAvailableApiList = [];
const baseStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// cookie拓展框架
// https://developer.mozilla.org/en-US/docs/DOM/document.cookie
var docCookies = {
    getItem: function (sKey) {
        return (
            decodeURIComponent(
                document.cookie.replace(
                    new RegExp(
                        '(?:(?:^|.*;)\\s*' +
                            encodeURIComponent(sKey).replace(/[-.+*]/g, '\\$&') +
                            '\\s*\\=\\s*([^;]*).*$)|^.*$',
                    ),
                    '$1',
                ),
            ) || null
        );
    },
    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
        if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
            return false;
        }
        var sExpires = '';
        if (vEnd) {
            switch (vEnd.constructor) {
                case Number:
                    sExpires =
                        vEnd === Infinity
                            ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT'
                            : '; max-age=' + vEnd;
                    break;
                case String:
                    sExpires = '; expires=' + vEnd;
                    break;
                case Date:
                    sExpires = '; expires=' + vEnd.toUTCString();
                    break;
            }
        }
        document.cookie =
            encodeURIComponent(sKey) +
            '=' +
            encodeURIComponent(sValue) +
            sExpires +
            (sDomain ? '; domain=' + sDomain : '') +
            (sPath ? '; path=' + sPath : '') +
            (bSecure ? '; secure' : '');
        return true;
    },
    removeItem: function (sKey, sPath, sDomain) {
        if (!sKey || !this.hasItem(sKey)) {
            return false;
        }
        document.cookie =
            encodeURIComponent(sKey) +
            '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' +
            (sDomain ? '; domain=' + sDomain : '') +
            (sPath ? '; path=' + sPath : '');
        return true;
    },
    hasItem: function (sKey) {
        return new RegExp(
            '(?:^|;\\s*)' + encodeURIComponent(sKey).replace(/[-.+*]/g, '\\$&') + '\\s*\\=',
        ).test(document.cookie);
    },
    keys: /* optional method: you can safely remove it! */ function () {
        var aKeys = document.cookie
            .replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, '')
            .split(/\s*(?:\=[^;]*)?;\s*/);
        for (var nIdx = 0; nIdx < aKeys.length; nIdx++) {
            aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]);
        }
        return aKeys;
    },
};

function loadPage() {
    resetElements();
    resetCookies();
    addListeners();
    switchElementContent('#year', getTime('yyyy'), 0);
    zoomPics();
    if (analyzeURL(window.location.href, 'u') !== '') {
        pjaxLoad(base.decrypt(analyzeURL(window.location.href, 'u')));
    }
    switchElementContent('#loading-text', '<span class="green-text"> Completed.</span>');
    setTimeout(function () {
        domLoadShade.classList.toggle('active');
        setTimeout(function () {
            var loadList = document.querySelectorAll('.loading:not(.listprogram)');
            for (let i = 0; i < loadList.length; i++) {
                loadList[i].classList.add('loaded');
            }
            setTimeout(() => {
                main();
                loadPageType();
            }, 0);
            firstLoad();
        }, 400);
    }, 600);
}

function loadComplete(resource) {
    loadingResources.push(resource);
    if (loadingResources.length == loadResources.length) {
        if (
            docCookies.getItem('lastLoadTime') == null ||
            parseInt(getTime('yyyyMMDDhhmmss')) - parseInt(docCookies.getItem('lastLoadTime')) >=
                500
        ) {
            setTimeout(function () {
                loadPage();
                docCookies.setItem('lastLoadTime', getTime('yyyyMMDDhhmmss'));
            }, 300);
        } else {
            // domLoadShade.classList.toggle('active');
            // setTimeout(function(){
            // var loadList = document.querySelectorAll(".loading");
            // for (i = 0; i < loadList.length; i++) {
            //    loadList[i].classList.remove('loading');
            // }
            // },200)
            setTimeout(function () {
                loadPage();
                docCookies.setItem('lastLoadTime', getTime('yyyyMMDDhhmmss'));
            }, 300);
        }
    }
}

function firstLoad() {
    instantPageLoad();
    if (docCookies.getItem('musicPlayingName') !== null) {
        switchElementContent('#music-name', docCookies.getItem('musicPlayingName'));
    }
    if (docCookies.getItem('musicPlayingSource') !== null) {
        music.src = docCookies.getItem('musicPlayingSource');
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

function prefetch(href) {
    const fatherContent = document.querySelector('#page-prefetch');
    const prefetchLink = document.createElement('link');
    prefetchLink.href = href;
    prefetchLink.rel = 'prefetch';
    prefetchLink.as = 'script';
    fatherContent.appendChild(prefetchLink);
}

function addScript(url, onloadFunction = '') {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.setAttribute('onload', onloadFunction);
    head.appendChild(script);
}

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
