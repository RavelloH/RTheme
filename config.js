const config = {
    siteName: "RavelloH's Blog", // 站点名
    siteShortname: "RH's Blog", // 站点简称
    author: 'RavelloH', // 作者名
    description: "RavelloH's Blog", // 站点描述
    sign: 'Debug the life.', // 站点签名
    siteURL: 'https://ravelloh.top/', // 站点地址,带有尾缀斜杠
    pwaStartURL: '/?mode=pwa', // PWA启动地址
    lang: 'zh-CN', // 站点语言
    iconImage: 'icon.png', // 站点图标
    githubUserName: 'RavelloH', // github用户名
    mail: 'ravelloh@outlook.com', // 邮箱
    copyrightStartTime: '2019', // 建站开始年份
    siteBirthday: '2/03/2019 20:52:00', // 站点建立时间
    siteHelloWords: 'Beginning of meditation.', // 站点欢迎语
    defaultScript: '<script>function main(){}</script>', // 默认站点脚本
    remotePath: '', // 远程资源路径，主站点不填
    trustDomain: ['ravelloh.top'],
    musicApi: 'https://music.api.ravelloh.top/',
    playList: '504715858',
    screenshotApi: 'https://screenshot.ravelloh.top/',
    twitterUsername: '@ravelohh',
    nav: [
        // 菜单导航设置
        {
            name: '主页',
            link: '/',
            id: 'nav-home',
        },
        {
            name: '项目',
            link: '/projects',
            id: 'nav-projects',
        },
        {
            name: '文稿',
            link: '/posts',
            id: 'nav-posts',
        },
        {
            name: '分类',
            link: '/categories',
            id: 'nav-categories',
        },
        {
            name: '标签',
            link: '/tags',
            id: 'nav-tags',
        },
        {
            name: '友链',
            link: '/friends',
            id: 'nav-friends',
        },
        {
            name: '关于',
            link: '/about',
            id: 'nav-about',
        },
    ],
    footer: [
        // footer icon
        {
            id: 'icon-github',
            href: 'https://github.com/ravelloh',
            icon: 'ri-github-line',
            additions: {
                target: '_blank',
                dataUmamiEvent: 'footer-Github',
                ariaLabel: 'my github',
            },
        },
        {
            id: 'icon-studio',
            href: 'https://xeocnet-studio.github.io/',
            icon: 'ri-building-2-line',
            additions: {
                target: '_blank',
                dataUmamiEvent: 'footer-工作室',
                ariaLabel: 'my studio',
            },
        },
    ],
    menu: [
        //menu items
        {
            name: 'HOME',
            href: '/',
            icon: 'ri-home-3-fill',
        },
        {
            name: 'PROJECTS',
            href: '/projects',
            icon: 'ri-dashboard-fill',
        },
        {
            name: 'POSTS',
            href: '/posts',
            icon: 'ri-article-fill',
        },
        {
            name: 'CATEGORIES',
            href: '/categories',
            icon: 'ri-folder-fill',
        },
        {
            name: 'TAGS',
            href: '/tags',
            icon: 'ri-price-tag-3-fill',
        },
        // {
        //     name: 'IMAGES',
        //     href: '/images',
        //     icon: 'ri-image-fill',
        // },
        // {
        //     name: 'GAMES',
        //     href: '/games',
        //     icon: 'ri-gamepad-fill',
        // },
        {
            name: 'FRIENDS',
            href: '/friends',
            icon: 'ri-team-fill',
        },
        // {
        //     name: 'TIMELINE',
        //     href: '/timeline',
        //     icon: 'ri-map-pin-time-fill',
        // },
        {
            name: 'MESSAGE',
            href: '/message',
            icon: 'ri-message-2-fill',
        },
        {
            name: 'ABOUT',
            href: '/about',
            icon: 'ri-information-fill',
        },
        {
            // 空白占位分隔
            name: null,
        },

        {
            name: 'SIGN IN',
            href: '/account/signin',
            icon: 'ri-login-box-fill',
        },
        {
            name: 'SIGN UP',
            href: '/account/signup',
            icon: 'ri-user-add-fill',
        },
        {
            name: 'ANALYTICS',
            href: 'https://analytics.ravelloh.top/share/4kyzPMCCpfG9Vd1k/blog',
            icon: 'ri-bar-chart-box-fill',
        },
        {
            name: 'DRIVE',
            href: 'https://drive.ravelloh.top/',
            icon: 'ri-hard-drive-3-fill',
        },
        {
            name: 'UPTIME',
            href: 'https://monitor.ravelloh.top/',
            icon: 'ri-timer-flash-fill',
        },
        {
            name: 'CHATROOM',
            href: 'https://chat.ravelloh.top/ravelloh',
            icon: 'ri-video-chat-fill',
        },
        {
            name: 'MUSIC',
            href: 'https://music.ravelloh.top/',
            icon: 'ri-album-fill',
        },
        {
            name: 'PSGAME',
            href: 'https://psgamespider.ravelloh.top/',
            icon: 'ri-playstation-fill',
        },
    ],
    umami: {
        url: 'https://analytics.ravelloh.top/',
        scirpt: 'https://analytics.ravelloh.top/script.js',
        id: 'f47e2dc3-f6bf-4d7c-b311-7467bb1b17e5',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3ZWJzaXRlSWQiOiJmNDdlMmRjMy1mNmJmLTRkN2MtYjMxMS03NDY3YmIxYjE3ZTUiLCJpYXQiOjE3MjA3OTc2MTB9.F2K7fuCqjUCbIQDm7ygX98kRTCdkusHpgv27qQ4YZSY',
        apiUrl: 'https://analytics.api.ravelloh.top/',
    },
    uptime: {
        apiUrl: 'https://uptime.api.ravelloh.top',
    },
};

export default config;
