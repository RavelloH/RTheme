// RTheme v3 - analysis.js(统计脚本)
// 注：此脚本仅用于模板用途

function initAnalytics() {
    // 可选Umami/百度统计
    // 使用哪个，取消注释哪个，并修改相关配置信息

    // umamiAnalytics();
    // baiduAnalysis();
}

function umamiAnalytics() {
    if (docCookies.getItem('settingEnableUmamiAnalytics') == 'false') {
        return false;
    }
    (function () {
        addEvent(getUmamiEventList());
        var umami = document.createElement('script');
        // 如果使用Umami，将下方848f2596-81ce-4c69-a91c-5c78ad85915b替换为你的site id
        umami.setAttribute('data-website-id', '848f2596-81ce-4c69-a91c-5c78ad85915b');
        if (docCookies.getItem('settingEnableUmamiCache') == 'true') {
            umami.setAttribute('data-cache', 'true');
        }
        // 更改下方src为你的umami统计脚本位置
        umami.src = 'https://analytics.ravelloh.top/script.js';
        var an = document.getElementsByTagName('script')[0];
        an.parentNode.insertBefore(umami, an);
    })();
}

function baiduAnalysis() {
    if (docCookies.getItem('settingEnableBaiduTongji') == 'true') {
        var _hmt = _hmt || [];
        (function () {
            var hm = document.createElement('script');
            // 修改以下src为你的baidu统计脚本中的路径
            hm.src = 'https://hm.baidu.com/hm.js?dbfc04c30a6804002416a339a4023685';
            var s = document.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(hm, s);
        })();
    }
}

function addEvent(list) {
    if (docCookies.getItem('settingEnableUmamiEvents') == 'false') {
        return false;
    }
    list.forEach((item) => {
        document.querySelector(item[0]).setAttribute('data-umami-event', item[1]);
    });
}

function getUmamiEventList() {
    return [
        ['#avatar',
            'header-头像'],
        ['#toggle',
            'ui-菜单按钮'],
        ['#infobar-toggle',
            'ui-信息栏按钮'],
        ['#icon-about',
            'footer-关于'],
        ['#icon-github',
            'footer-Github'],
        ['#icon-rss',
            'footer-RSS'],
        ['#icons-right',
            'footer-消息栏'],
        ['#email',
            'menu-邮箱'],
        ['#icon-swap',
            'menu-切换服务器'],
        ['#icon-color',
            'menu-切换颜色'],
        ['#icon-music',
            'menu-音乐栏'],
        ['#icon-fullscreen',
            'menu-全屏'],
        ['#icon-setting',
            'menu-设置'],
        ['#icon-share',
            'menu-分享'],
    ];
}

function getRealTimeVisitors(mode = 'return') {
    // Umami 实时访客API，按需接入
    // 接入后，注释下方的return false
    return false


    let site = 'https://analytics.ravelloh.top';

    // 你的共享链接Token
    let token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjljM2Y1OWJiLTE0OGQtNTk4OC1hY2NjLTdmNDhjOTJhOWIzMiIsIndlYnNpdGVJZCI6ImY0N2UyZGMzLWY2YmYtNGQ3Yy1iMzExLTc0NjdiYjFiMTdlNSIsImhvc3RuYW1lIjoibG9jYWxob3N0IiwiYnJvd3NlciI6ImNocm9tZSIsIm9zIjoiTGludXgiLCJkZXZpY2UiOiJsYXB0b3AiLCJzY3JlZW4iOiI3NTN4MTIwNSIsImxhbmd1YWdlIjoiemgtQ04iLCJjb3VudHJ5IjoiQ04iLCJzdWJkaXZpc2lvbjEiOiJDTi1TRCIsInN1YmRpdmlzaW9uMiI6bnVsbCwiY2l0eSI6IlFpbmdkYW8iLCJjcmVhdGVkQXQiOiIyMDIzLTA2LTExVDA3OjA4OjU4LjAwMFoiLCJpYXQiOjE2ODY0NjczMzd9.Qli8kEukIWdN3nV8ioWIqaPQn0m4b3loIddLZo-9HDE';

    // 你的站点idAPI
    let apiURL = site + '/api/websites/f47e2dc3-f6bf-4d7c-b311-7467bb1b17e5/active';
    fetch(apiURL, {
        headers: {
            'x-umami-share-token': token,
        },
    })
    .then((response) => response.json())
    .then((data) => {
        if (isLayoutMenuOpen() && mode == 'switch') {
            return switchMessageBarContent(structureOnlineVistor(data[0].x));
        }
        if (mode == 'return') {
            return data[0].x;
        }
    });
}

function getPageVisitors(url = window.location.pathname) {
    // Umami 访问量统计API
    // 可自行部署，仓库：https://github.com/RavelloH/umami-api-route
    // 部署后，删除下方代码
    return Promise.resolve({
        "pageviews": {
            "value": "未接入服务"
        }
    });
    // 部署后，删除上方代码


    return new Promise((resolve, reject) => {
        let apiURL = `https://analytics.api.ravelloh.top/pageview?url=${url}`;
        fetch(apiURL)
        .then((response) => response.json())
        .then((data) => {
            resolve(data);
        });
    }).catch((err) => {
        throw err;
    });
}

function loadUptime() {
    // Uptime API， 可自行部署，仓库: https://github.com/RavelloH/uptime-api-route
    if (docCookies.getItem('settingEnableUptime') == 'false') {
        return false;
    }
    if (typeof uptimeData == 'undefined') {
        return new Promise((resolve, reject) => {
            let site = 'https://uptime.api.ravelloh.top';
            fetch(site, {})
            .then((response) => response.json())
            .then((data) => {
                resolve(data);
                uptimeData = data;
            });
        }).catch((err) => {
            throw err;
        });
    } else {
        return Promise.resolve(uptimeData);
    }
}