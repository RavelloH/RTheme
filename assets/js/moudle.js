//
// virgule.js
//
// github.com/ravelloh/virgule.js
//
randArrMin = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
];
randArr = [
    'あ',
    'ぃ',
    'い',
    'ぅ',
    'う',
    'ぇ',
    'え',
    'ぉ',
    'お',
    'か',
    'が',
    'き',
    'ぎ',
    'く',
    'ぐ',
    'け',
    'げ',
    'こ',
    'ご',
    'さ',
    'ざ',
    'し',
    'じ',
    'す',
    'ず',
    'せ',
    'ぜ',
    'そ',
    'ぞ',
    'た',
    'だ',
    'ち',
    'ぢ',
    'っ',
    'つ',
    'づ',
    'て',
    'で',
    'と',
    'ど',
    'な',
    'に',
    'ぬ',
    'ね',
    'の',
    'は',
    'ば',
    'ぱ',
    'ひ',
    'び',
    'ぴ',
    'ふ',
    'ぶ',
    'ぷ',
    'へ',
    'べ',
    'ぺ',
    'ほ',
    'ぼ',
    'ぽ',
    'ま',
    'み',
    'む',
    'め',
    'も',
    'ゃ',
    'や',
    'ゅ',
    'ゆ',
    'ょ',
    'よ',
    'ら',
    'り',
    'る',
    'れ',
    'ろ',
    'ゎ',
    'わ',
    'ゐ',
    'ゑ',
    'を',
    'ん',
    'ゔ',
    'ゕ',
    'ゖ',
    'ァ',
    'ア',
    'ィ',
    'イ',
    'ゥ',
    'ウ',
    'ェ',
    'エ',
    'ォ',
    'オ',
    'カ',
    'ガ',
    'キ',
    'ギ',
    'ク',
    'グ',
    'ケ',
    'ゲ',
    'コ',
    'ゴ',
    'サ',
    'ザ',
    'シ',
    'ジ',
    'ス',
    'ズ',
    'セ',
    'ゼ',
    'ソ',
    'ゾ',
    'タ',
    'ダ',
    'チ',
    'ヂ',
    'ッ',
    'ツ',
    'ヅ',
    'テ',
    'デ',
    'ト',
    'ド',
    'ナ',
    'ニ',
    'ヌ',
    'ネ',
    'ノ',
    'ハ',
    'バ',
    'パ',
    'ヒ',
    'ビ',
    'ピ',
    'フ',
    'ブ',
    'プ',
    'ヘ',
    'ベ',
    'ペ',
    'ホ',
    'ボ',
    'ポ',
    'マ',
    'ミ',
    'ム',
    'メ',
    'モ',
    'ャ',
    'ヤ',
    'ュ',
    'ユ',
    'ョ',
    'ヨ',
    'ラ',
    'リ',
    'ル',
    'レ',
    'ロ',
    'ヮ',
    'ワ',
    'ヰ',
    'ヱ',
    'ヲ',
    'ン',
    'ヴ',
    'ヵ',
    'ヶ',
    'ヷ',
    'ヸ',
    'ヹ',
    'ヺ',
    'ー',
    'ヾ',
    'ㄅ',
    'ㄆ',
    'ㄇ',
    'ㄈ',
    'ㄉ',
    'ㄊ',
    'ㄋ',
    'ㄌ',
    'ㄍ',
    'ㄎ',
    'ㄏ',
    'ㄐ',
    'ㄑ',
    'ㄒ',
    'ㄓ',
    'ㄔ',
    'ㄕ',
    'ㄖ',
    'ㄗ',
    'ㄘ',
    'ㄙ',
    'ㄝ',
    'ㄞ',
    'ㄟ',
    'ㄠ',
    'ㄡ',
    'ㄢ',
    'ㄣ',
    'ㄤ',
    'ㄥ',
    'ㄦ',
    'ㄧ',
    'ㄨ',
    'ㄩ',
    '〇',
    '口',
    '甲',
    '乙',
    '丙',
    '丁',
    '戊',
    '己',
    '庚',
    '辛',
    '壬',
    '癸',
];

function virgule(target, context, speed = 100) {
    //context重组
    contextArr = [];
    for (var i = 0; i < context.length; i++) {
        contextArr.push(context[i]);
    }
    // 添加/
    target.innerHTML = '/';
    numVirgule = 0;
    var virgulegenerate = setInterval(function () {
        // 字符划分
        if (escape(contextArr[numVirgule]).indexOf('%u') < 0) {
            if (contextArr[numVirgule] == ' ') {
                target.innerHTML += ' ';
            } else {
                target.innerHTML += '/';
            }
        } else {
            target.innerHTML += '//';
        }
        numVirgule += 1;
        if (numVirgule > context.length) {
            clearInterval(virgulegenerate);
            target.innerHTML = target.innerHTML.slice(0, target.innerHTML.length - 1);
            setTimeout(function () {
                textIn();
            }, 100);
        }
    }, 1000 / speed);
    // 文字进入
    numIn = 0;
    numCharacter = 0;

    function textIn() {
        originText = target.innerHTML;
        var virgulereplace = setInterval(function () {
            numIn += 1;
            if (numIn >= contextArr.length) {
                clearInterval(virgulereplace);
                textwrite();
            }
            cacheText = '';
            numCharacter = 0;
            for (i = 0; i < numIn; i++) {
                if (escape(contextArr[i]).indexOf('%u') < 0) {
                    if (contextArr[i] == ' ') {
                        cacheText += ' ';
                        numCharacter += 1;
                    } else {
                        //单字符
                        var rand = Math.floor(Math.random() * randArrMin.length);
                        cacheText += randArrMin[rand];
                        numCharacter += 1;
                    }
                } else {
                    // 双字符
                    var rand = Math.floor(Math.random() * randArr.length);
                    cacheText += randArr[rand];
                    numCharacter += 2;
                }
            }
            target.innerHTML = cacheText + originText.slice(numCharacter, originText.length);
        }, 2000 / speed);
        // 原始文字写入
        numWrite = 0;

        function textwrite() {
            originText = target.innerHTML;
            var virgulewrite = setInterval(function () {
                numWrite += 1;
                if (numWrite >= contextArr.length) {
                    clearInterval(virgulewrite);
                }
                cacheText = '';
                numCharacter = 0;
                for (i = 0; i < numIn; i++) {
                    if (escape(contextArr[i]).indexOf('%u') < 0) {
                        if (contextArr[i] == ' ') {
                            cacheText += ' ';
                            numCharacter += 1;
                        } else {
                            //单字符
                            var rand = Math.floor(Math.random() * randArrMin.length);
                            cacheText += randArrMin[rand];
                            numCharacter += 1;
                        }
                    } else {
                        // 双字符
                        var rand = Math.floor(Math.random() * randArr.length);
                        cacheText += randArr[rand];
                        numCharacter += 2;
                    }
                }
                target.innerHTML =
                    context.slice(0, numWrite) +
                    cacheText.slice(numWrite, cacheText.length) +
                    originText.slice(numCharacter, originText.length - 1);
            }, 2000 / speed);
        }
    }
}
function instantPageLoad() {
    if (docCookies.getItem('settingEnableInstantPage') == 'false') {
        return false;
    }
    /*! instant.page v5.2.0 - (C) 2019-2023 Alexandre Dieulot - https://instant.page/license */
    let t,
        e,
        n,
        o,
        i,
        a = null,
        s = 65,
        c = new Set();
    const r = 1111;
    function d(t) {
        o = performance.now();
        const e = t.target.closest('a');
        m(e) && p(e.href, 'high');
    }
    function u(t) {
        if (performance.now() - o < r) return;
        if (!('closest' in t.target)) return;
        const e = t.target.closest('a');
        m(e) &&
            (e.addEventListener('mouseout', f, {
                passive: !0,
            }),
            (i = setTimeout(() => {
                p(e.href, 'high'), (i = void 0);
            }, s)));
    }
    function l(t) {
        const e = t.target.closest('a');
        m(e) && p(e.href, 'high');
    }
    function f(t) {
        (t.relatedTarget && t.target.closest('a') == t.relatedTarget.closest('a')) ||
            (i && (clearTimeout(i), (i = void 0)));
    }
    function h(t) {
        if (performance.now() - o < r) return;
        const e = t.target.closest('a');
        if (t.which > 1 || t.metaKey || t.ctrlKey) return;
        if (!e) return;
        e.addEventListener(
            'click',
            function (t) {
                1337 != t.detail && t.preventDefault();
            },
            {
                capture: !0,
                passive: !1,
                once: !0,
            },
        );
        const n = new MouseEvent('click', {
            view: window,
            bubbles: !0,
            cancelable: !1,
            detail: 1337,
        });
        e.dispatchEvent(n);
    }
    function m(o) {
        if (o && o.href && (!n || 'instant' in o.dataset)) {
            if (o.origin != location.origin) {
                if (!(e || 'instant' in o.dataset) || !a) return;
            }
            if (
                ['http:', 'https:'].includes(o.protocol) &&
                ('http:' != o.protocol || 'https:' != location.protocol) &&
                (t || !o.search || 'instant' in o.dataset) &&
                !(
                    (o.hash && o.pathname + o.search == location.pathname + location.search) ||
                    'noInstant' in o.dataset
                )
            )
                return !0;
        }
    }
    function p(t, e = 'auto') {
        if (c.has(t)) return;
        const n = document.createElement('link');
        (n.rel = 'prefetch'),
            (n.href = t),
            (n.fetchPriority = e),
            (n.as = 'document'),
            document.head.appendChild(n),
            c.add(t);
    }
    !(function () {
        if (!document.createElement('link').relList.supports('prefetch')) return;
        const o = 'instantVaryAccept' in document.body.dataset || 'Shopify' in window,
            i = navigator.userAgent.indexOf('Chrome/');
        i > -1 && (a = parseInt(navigator.userAgent.substring(i + 'Chrome/'.length)));
        if (o && a && a < 110) return;
        const c = 'instantMousedownShortcut' in document.body.dataset;
        (t = 'instantAllowQueryString' in document.body.dataset),
            (e = 'instantAllowExternalLinks' in document.body.dataset),
            (n = 'instantWhitelist' in document.body.dataset);
        const r = {
            capture: !0,
            passive: !0,
        };
        let f = !1,
            v = !1,
            g = !1;
        if ('instantIntensity' in document.body.dataset) {
            const t = document.body.dataset.instantIntensity;
            if (t.startsWith('mousedown')) (f = !0), 'mousedown-only' == t && (v = !0);
            else if (t.startsWith('viewport')) {
                const e = navigator.connection && navigator.connection.saveData,
                    n =
                        navigator.connection &&
                        navigator.connection.effectiveType &&
                        navigator.connection.effectiveType.includes('2g');
                e ||
                    n ||
                    ('viewport' == t
                        ? document.documentElement.clientWidth *
                              document.documentElement.clientHeight <
                              45e4 && (g = !0)
                        : 'viewport-all' == t && (g = !0));
            } else {
                const e = parseInt(t);
                isNaN(e) || (s = e);
            }
        }
        v || document.addEventListener('touchstart', d, r);
        f
            ? c || document.addEventListener('mousedown', l, r)
            : document.addEventListener('mouseover', u, r);
        c && document.addEventListener('mousedown', h, r);
        if (g) {
            let t = window.requestIdleCallback;
            t ||
                (t = (t) => {
                    t();
                }),
                t(
                    function () {
                        const t = new IntersectionObserver((e) => {
                            e.forEach((e) => {
                                if (e.isIntersecting) {
                                    const n = e.target;
                                    t.unobserve(n), p(n.href);
                                }
                            });
                        });
                        document.querySelectorAll('a').forEach((e) => {
                            m(e) && t.observe(e);
                        });
                    },
                    {
                        timeout: 1500,
                    },
                );
        }
    })();
}
