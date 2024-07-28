// RTheme v3 - analysis.js(统计脚本)
// 注：请勿将此脚本用于你的个人博客，此脚本仅由RavelloH使用用于统计个人博客访问情况
import global from './Global';
import i18n from './i18n';
import config from '../../../config';
import cookie from './lib/cookie';
import message from '@/utils/message';

let uptimeData;
function umamiAnalytics() {
    if (cookie.getItem('settingEnableUmamiAnalytics') == 'false') {
        return false;
    }
    // // 检测这是不是我自己的域名
    // if (/rav.*h/.test(window.location.hostname) == false) {
    //     return false;
    // }
    (function () {
        addEvent(getUmamiEventList());
        var umami = document.createElement('script');
        umami.setAttribute('data-website-id', config.umami.id);
        if (cookie.getItem('settingEnableUmamiCache') == 'true') {
            umami.setAttribute('data-cache', 'true');
        }
        umami.src = config.umami.scirpt;
        var an = document.getElementsByTagName('script')[0];
        an.parentNode.insertBefore(umami, an);
    })();
}

function addEvent(list) {
    // if (cookie.getItem('settingEnableUmamiEvents') == 'false') {
    //     return false;
    // }
    // list.forEach((item) => {
    //     document.querySelector(item[0]).setAttribute('data-umami-event', item[1]);
    // });
}

function getUmamiEventList() {
    return [
        ['#avatar', 'header-头像'],
        ['#avatarname', 'header-LOGO'],
        ['#toggle', 'ui-菜单按钮'],
        ['#infobar-toggle', 'ui-信息栏按钮'],
        ['#icon-about', 'footer-关于'],
        ['#icon-github', 'footer-Github'],
        ['#icon-studio', 'footer-工作室'],
        ['#icon-rss', 'footer-RSS'],
        ['#icons-right', 'footer-消息栏'],
        ['#email', 'menu-邮箱'],
        ['#icon-swap', 'menu-切换服务器'],
        ['#icon-color', 'menu-切换颜色'],
        ['#icon-music', 'menu-音乐栏'],
        ['#icon-fullscreen', 'menu-全屏'],
        ['#icon-setting', 'menu-设置'],
        ['#icon-share', 'menu-分享'],
    ];
}

function getRealTimeVisitors(mode = 'return') {
    let site = config.umami.url;
    let token = config.umami.token;
    let apiURL = site + 'api/websites/' + config.umami.id + '/active';
    fetch(apiURL, {
        headers: {
            'x-umami-share-token': token,
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (global.isLayoutMenuOpen() && mode == 'switch') {
                return message.switch(i18n.structureOnlineVistor(data.x));
            }
            if (mode == 'return') {
                return data.x;
            }
        });
}

function getPageVisitors(url = window.location.pathname) {
    return new Promise((resolve, reject) => {
        let apiURL = `${config.umami.apiUrl}pageview?url=${url}`;
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
    if (cookie.getItem('settingEnableUptime') == 'false') {
        return false;
    }
    if (typeof uptimeData !== 'object') {
        return new Promise((resolve) => {
            let site = config.uptime.apiUrl;
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

export default {
    getRealTimeVisitors,
    getPageVisitors,
    loadUptime,
    umamiAnalytics,
};
