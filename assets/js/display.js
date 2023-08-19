// RTheme v3 - display.js

// 作品显示
function workShow(element) {
    document.querySelectorAll('.work-program').forEach((e) => {
        e.parentNode.classList.add('no-delay');
        e.parentNode.setAttribute('style', '--i: 1');
        e.parentNode.style.opacity = 0.5;
        e.parentNode.lastElementChild.style.opacity = 0.5;
    });
    element.parentNode.style.opacity = 1;
    element.parentNode.lastElementChild.style.opacity = 0.5;
    displayItem = element.querySelector('h4').innerHTML;
    let md = element.querySelector('aside').attributes['doc'];
    if (typeof md !== 'undefined') {
        var mdContainer = `<h3>文档</h3><hr><div id='markdown-area'><div class="square-loader"><span></span><span></span><span></span><span></span><span></span></div></div>`;
        setTimeout(() => {
            getMarkdownToHTML(md.value, element.querySelector('h4').innerHTML);
        }, 310);
    } else {
        var mdContainer = '';
    }

    if (getElementInnerhtml('#showarea h3') == 'WORKS / <wbr>作品') {
        var text = `
        <div class='work-show'>
        <div class='work-show-head'><hr class='light'><h4 class='virgule'>${
            element.querySelector('h4').innerHTML
        }</h3><hr class='light'></div>
        <div class='work-show-body'><p>${element.querySelector('aside .work-info').innerHTML}</p>
        <div id='markdown-doc'>${mdContainer}</div>
        </div>
        <div class='work-show-foot'><div id='work-display-links'>${
            element.querySelector('aside .work-urls').innerHTML
        }</div><hr class='light'><span class='operation-block' onclick='workClear()'><span class="i_small ri:arrow-go-back-line"></span>&nbsp;返回</span></div>
        </div>
        `;
        switchElementContent('#showarea', text);
    } else {
        virgule(
            document.querySelector('#showarea .work-show-head .virgule'),
            element.querySelector('h4').innerHTML,
        );
        switchElementContent(
            '#showarea .work-show-body',
            `<p>${
                element.querySelector('aside .work-info').innerHTML
            }</p><div id='markdown-doc'>${mdContainer}</div>`,
        );
        switchElementContent(
            '#showarea .work-show-foot #work-display-links',
            element.querySelector('aside .work-urls').innerHTML,
        );
    }
}

// 设置默认内容
function getDefaultWorkInner() {
    let githubUserName
    return `
    <h3>WORKS / <wbr>作品</h3>
    <span class="virgule">
    收录 & 索引个人作品。在右侧选择以预览...
    </span><span class="virgule" id="numOfWorks">共收录${
        document.querySelectorAll('.listprogram').length
    }个作品/项目。</span>
    <div class="button-list">
    <a class="button" href="https://github.com/${githubUserName}?tab=repositories"><span class="i_small ri:github-line"></span> Github ></a>
    </div>
    `;
}

// MD转HTML
async function getMarkdownToHTML(url, name) {
    let data = await (await fetch('https://markdown.api.ravelloh.top/?url=' + url)).text();
    if (name == displayItem) {
        switchElementContent('#markdown-area', data);
        setTimeout(() => {
            codeHighlight();
            zoomPics();
            document.querySelectorAll('#markdown-area img').forEach((element) => {
                element.setAttribute('onload', 'imgLoad(this)');
            });
        }, 300);
    }
}

// 代码高亮
function codeHighlight() {
    if (docCookies.getItem('settingEnableCodeHighlight') == 'false') {
        return false;
    }
    var codeEl = document.querySelectorAll(
        'pre code:not([highlight]) , .codeline pre:not([highlight]) , pre.codeline:not([highlight])',
    );
    var progressNum = 0;
    if (codeEl.length !== 0) {
        var worker = new Worker('/assets/js/worker/highlight.worker.js');
        addMessageBarQueue(
            '<a>正在渲染语法高亮&nbsp;<span class="i ri:file-code-line"></span></a>',
            getRandomInteger(1000, 2000),
        );
        startHighlight();
    } else {
        return false;
    }

    function startHighlight() {
        if (progressNum < codeEl.length) {
            worker.onmessage = (event) => {
                codeEl[progressNum].innerHTML = event.data;
                codeEl[progressNum].setAttribute('highlight', 'true');
                progressNum += 1;
                startHighlight();
            };
            worker.postMessage(codeEl[progressNum].innerHTML);
        } else {
            worker.terminate();
        }
    }
}

// 文章过滤
function articlesFilter() {
    let tagList = [];
    let classList = [];
    let strs = '';
    let articles = '';
    let hash = window.location.hash;
    articlesModel.forEach((e) => {
        e.tag.forEach((tag) => {
            tagList.push(tag);
        });
        e.class.forEach((cla) => {
            classList.push(cla);
        });
    });
    tagList = Array.from(new Set(tagList));
    classList = Array.from(new Set(classList));
    tagList.sort((a, b) => {
        return collator.compare(a, b);
    });
    classList.sort((a, b) => {
        return collator.compare(a, b);
    });
    if (typeof originIndexTitle == 'undefined') {
        originIndexTitle = `
        <h3 id='articles-index-title'>ARTICLES / <wbr>文章</h3><br>
        <div class="form-control">
        <input type="search" required="" oninput="search(this.value)" onpropertychange="search(this.value)" onfocus="searchInit()" onblur="searchClose()"/ id="search-bar"><label><span
        class="i_small ri:search-2-line" style="--i: 0;">&nbsp;</span><span
        style="--i: 1">搜</span><span style="--i: 2">索</span><span style="--i: 3">文</span><span
        style="--i: 4">章</span><span style="--i: 5">全</span><span style="--i: 6">文</span><span
        style="--i: 7">.</span><span style="--i: 8">.</span></span><span
        style="--i: 9">.</span></label>
        </div>
        <span class="virgule" id="articles-info-1">
        记录&索引所有文章。
        </span>
        <span class="virgule" id="index-info">
        共索引${
            document.querySelectorAll('.listlines .listprogram').length
        }篇文章，最近更新于${getTime(
            'DD',
            document.querySelector('.listprogram .articles-info time').innerHTML,
        )}天前。
        </span>`;
    }
    if (hash.startsWith('#/tag/')) {
        let result = decodeURI(/([^/]+)$/.exec(hash)[0]);
        tagList.forEach((e) => {
            strs += `<a href='#/tag/${e}'>${e}</a>`;
        });
        let structure = `
        <div class='filter'>
        <div class='filter-head center'><hr class='light'><h4 class='virgule'>tags - 标签</h4><hr class='light'></div>
        <div class='filter-body taglist'>${strs.replace(
            `/${result}'`,
            `/${result}' class='active'`,
        )}</div>
        <div class='filter-footer'><hr class='light'><a class='operation-block no-effect' href='#/' onclick='switchElementContent(".texts",originIndexTitle);sortArticles("time")'><span class="i_small ri:arrow-go-back-line"></span>&nbsp;返回</a></div>
        </div></div>
        </div>`;
        if (
            getElementInnerhtml('.texts').indexOf('文章') !== -1 ||
            getElementInnerhtml('.texts').indexOf('分类') !== -1
        ) {
            switchElementContent('.texts', structure);
        } else {
            document.querySelectorAll('.filter-body a').forEach((e) => {
                e.setAttribute('class', '');
                if (e.innerHTML == result) {
                    e.setAttribute('class', 'active');
                }
            });
        }
        articlesModel.forEach((e) => {
            e.tag.forEach((tag) => {
                if (tag == result) {
                    articles += structureArticlesList(e);
                }
            });
        });
        switchElementContent('.listlines', articles);
    }
    if (hash.startsWith('#/classification/')) {
        let result = decodeURI(/([^/]+)$/.exec(hash)[0]);
        classList.forEach((e) => {
            strs += `<a href='#/classification/${e}'>${e}</a>/`;
        });
        strs = strs.substring(0, strs.length - 1);
        let structure = `
        <div class='filter'>
        <div class='filter-head center'><hr class='light'><h4 class='virgule'>classification - 分类</h4><hr class='light'></div>
        <div class='filter-body class'>${strs.replace(
            `/${result}'`,
            `/${result}' class='active'`,
        )}</div>
        <div class='filter-footer'><hr class='light'><a class='operation-block no-effect' href='#/' onclick='switchElementContent(".texts",originIndexTitle);sortArticles("time")'><span class="i_small ri:arrow-go-back-line"></span>&nbsp;返回</a></div>
        </div></div>
        </div>`;
        if (
            getElementInnerhtml('.texts').indexOf('文章') !== -1 ||
            getElementInnerhtml('.texts').indexOf('标签') !== -1
        ) {
            switchElementContent('.texts', structure);
        } else {
            document.querySelectorAll('.filter-body a').forEach((e) => {
                e.setAttribute('class', '');
                if (e.innerHTML == result) {
                    e.setAttribute('class', 'active');
                }
            });
        }
        articlesModel.forEach((e) => {
            e.class.forEach((cla) => {
                if (cla == result) {
                    articles += structureArticlesList(e);
                }
            });
        });
        switchElementContent('.listlines', articles);
    }
    setTimeout(() => {
        resetTagList();
    }, 300);
    if (typeof window.location.hash == 'undefined') {
        return false;
    }
}

// 图片加载成功回调
function imgLoad(element) {
    element.classList.add('loaded');
}

// 图片加载错误回调
function imgError(element) {
    if (element.getAttribute('error') == 'true') {
        return;
    }
    element.setAttribute('error', 'true');
    if (element.getAttribute('type') == 'avatar') {
        element.src = '/assets/images/user.jpg';
        return;
    }
    element.src = '/assets/images/broke.jpg';
}

// 重置作品列表
function workClear() {
    switchElementContent('#showarea', getDefaultWorkInner());
    document.querySelectorAll('.work-program').forEach((e) => {
        e.parentNode.style.opacity = 1;
        e.parentNode.lastElementChild.style.opacity = 1;
    });
}

// 重置标签列表
function resetTagList() {
    document.querySelectorAll('.articles-tags').forEach((e) => {
        while (isEllipsisActive(e)) {
            if (e.lastElementChild.innerHTML == '···') {
                e.lastElementChild.remove();
            }
            e.lastElementChild.innerHTML = '···';
            e.lastElementChild.setAttribute('onclick', 'showArticlesInfo(this)');
            e.lastElementChild.classList.add('ellipsis');
            e.lastElementChild.href = '#';
        }
    });
}

// 引入评论脚本
function loadComment() {
    addScript('/assets/js/lib/twikoo.all.min.js', 'initComment()');
}

// 评论初始化
function initComment() {
    twikoo
        .init({
            // 这里填写你的envId
            envId: '',
            el: '#tcomment',
            onCommentLoaded: function () {
                addMessageBarQueue(
                    '<a>评论已加载&nbsp;<span class="i ri:chat-check-line"></span></a>',
                    1000,
                );
            },
        })
        .then(() => {
            addMessageBarQueue(
                '<a>已与评论服务器建立通讯&nbsp;<span class="i ri:message-line"></span></a>',
                2000,
            );
        })
        .catch((error) => {
            switchElementContent('#tcomment', structureErrorInfo(`评论加载异常 - ${error}`));
        });
}

// 切换时间显示格式
function switchTimeDisplay(element) {
    if (element.innerHTML.includes('-')) {
        element.setAttribute('time', element.innerHTML);
        switchElementContent(element, getTime('DD', element.innerHTML) + '天前');
    } else {
        switchElementContent(element, element.getAttribute('time'));
    }
}

// 索引数据拉取
function getSearchData() {
    if (docCookies.getItem('settingEnableSearchDataGet') == 'false') {
        return false;
    }
    if (typeof searchData == 'undefined') {
        return new Promise((resolve, reject) => {
            fetch('/assets/data/search.json', {})
                .then((response) => response.json())
                .then((data) => {
                    if (
                        typeof articlesModel == 'undefined' ||
                        docCookies.getItem('settingEnableSkipModelTest') == 'true'
                    ) {
                        searchData = data;
                        resolve(data);
                        return;
                    }
                    if (modelValidator(articlesModel, data)) {
                        searchData = data;
                        resolve(data);
                    } else {
                        showError('模型验证失败，请检查资源完整度');
                        reject(data);
                    }
                });
        }).catch((err) => {
            throw err;
        });
    } else {
        return Promise.resolve(searchData);
    }
}

// 模型验证
function modelValidator(pageModel, searchModel) {
    for (let i = 0; i < pageModel.length; i++) {
        if (
            pageModel[i]['name'] !== searchModel[i]['name'] ||
            pageModel[i]['url'] !== searchModel[i]['url'] ||
            pageModel[i]['time'] !== searchModel[i]['time']
        ) {
            return false;
        }
    }
    return true;
}

// 搜索
function search(keyword) {
    let start = new Date().getTime();
    if (keyword == '' || keyword == '.') {
        sortArticles('time');
        setTimeout(() => resetTagList(), 300);
        return false;
    }
    searchWord = HTMLDecode(keyword);
    getSearchData().then((data) => {
        if (typeof searchWorker == 'undefined') {
            searchWorker = new Worker('../assets/js/worker/search.worker.js');
        }
        searchWorker.onmessage = (result) => {
            let end = new Date().getTime();
            let data = result.data;
            switchElementContent('#index-info', `查询操作用时${end - start}MS`, 100);
            if (data.length == 0) {
                switchElementContent(
                    '.listlines',
                    "<div class='center'><span class='i_small ri:filter-off-line'></span>未找到有关选项。</div>",
                    0,
                );
                return false;
            }
            let resultHTML = '';
            data.forEach((e, index) => {
                resultHTML += structureSearchResult(e);
            });
            switchElementContent('.listlines', resultHTML, 0);
            resetTagList();
        };
        searchWorker.postMessage([data, searchWord]);
    });
}

// 搜索初始化
function searchInit() {
    switchElementContent('#articles-index-title', 'SEARCH / 索引器', 400);
    if (typeof searchData == 'undefined') {
        switchElementContent('#articles-info-1', '正在拉取索引文件...');
        getSearchData().then(() => {
            switchElementContent('#articles-info-1', '已解析索引文件');
        });
    } else {
        switchElementContent('#articles-info-1', '已解析索引文件');
    }
    if (typeof searchWorker == 'undefined') {
        switchElementContent('#index-info', '正在连接至Search Worker...');
        // 循环检测是否连接至worker
        searchWorker = new Worker('../assets/js/worker/search.worker.js');
        let workerChecker = setInterval(() => {
            if (typeof searchWorker !== 'undefined') {
                setTimeout(() => switchElementContent('#index-info', '已连接至Search Worker'), 300);
                clearInterval(workerChecker);
            }
        }, 200);
    } else {
        switchElementContent('#index-info', '已连接至Search Worker');
    }
}

// 搜索重置
function searchClose() {
    switchElementContent('#articles-index-title', 'Articles / 文章');
    switchElementContent('#articles-info-1', '记录&索引所有文章。');
    switchElementContent(
        '#index-info',
        `共索引${
            document.querySelectorAll('.listlines .listprogram').length
        }篇文章，最近更新于${getTime(
            'DD',
            document.querySelector('.listprogram .articles-info time').innerHTML,
        )}天前。`,
    );
}

// 文章旁路推荐
function loadMoreArticles(path) {
    let data = searchData;
    if (docCookies.getItem('settingEnableArticlesRecommand') == 'false') {
        return false;
    }
    for (let i = 0; i < data.length; i++) {
        if (data[i].url == path) {
            if (i == 0) {
                return `<div id="previous">
                <b><span class="i_small ri:arrow-left-s-line"></span> 上一篇</b><br>
                <span class="one-line">本篇文章已是最早一篇</span>
                </div>
                <div id="next" onclick="pjaxLoad('${data[i + 1].url}')">
                <b>下一篇 <span class="i_small ri:arrow-right-s-line"></span></b><br>
                <span class="one-line">${data[i + 1].name}</span>
                </div>`;
            }
            if (i == data.length - 1) {
                return `<div id="previous" onclick="pjaxLoad('${data[i - 1].url}')">
                <b><span class="i_small ri:arrow-left-s-line"></span> 上一篇</b><br>
                <span class="one-line">${data[i - 1].name}</span>
                </div>
                <div id="next">
                <b>下一篇 <span class="i_small ri:arrow-right-s-line"></span></b><br>
                <span class="one-line">本篇文章已是最后一篇</span>
                </div>`;
            }
            return `<div id="previous" onclick="pjaxLoad('${data[i - 1].url}')">
            <b><span class="i_small ri:arrow-left-s-line"></span> 上一篇</b><br>
            <span class="one-line">${data[i - 1].name}</span>
            </div>
            <div id="next" onclick="pjaxLoad('${data[i + 1].url}')">
            <b>下一篇 <span class="i_small ri:arrow-right-s-line"></span></b><br>
            <span class="one-line">${data[i + 1].name}</span>
            </div>`;
        }
    }
}

// 页面模型转换
function pageModelObjectCreater(arr) {
    this.name = arr[0];
    this.url = arr[1];
    this.time = arr[2];
    this.class = arr[3];
    this.tag = arr[4];
}

// 更新页面模型
function updatePageModel() {
    if (docCookies.getItem('settingEnablePageModel') == 'false') {
        return false;
    }
    let articlesList = document.querySelectorAll('#viewmap .listprogram');
    let name, url, time, tag, cla, object;
    let modelArr = [];
    articlesModel = [];
    articlesList.forEach((element) => {
        name = '';
        url = '';
        time = '';
        tag = [];
        cla = [];
        name = element.firstElementChild.children[0].firstElementChild.firstElementChild.innerHTML;
        url =
            element.firstElementChild.children[0].firstElementChild.firstElementChild.getAttribute(
                'href',
            );
        time = element.firstElementChild.children[1].firstElementChild.innerHTML;
        Array.from(element.firstElementChild.children[2].children).forEach((e) => {
            tag.push(e.innerHTML.toLowerCase());
        });
        Array.from(element.firstElementChild.children[1].lastElementChild.children).forEach((e) => {
            cla.push(e.innerHTML.toLowerCase());
        });
        modelArr.push([name, url, time, cla, tag]);
    });
    modelArr.forEach((e, index) => {
        object = new pageModelObjectCreater(e);
        articlesModel.push(object);
    });
}

// 文章信息展开
function showArticlesInfo(element) {
    let elementHref =
        element.parentNode.parentNode.firstElementChild.firstElementChild.firstElementChild
            .innerHTML;
    for (let i = 0; i < articlesModel.length; i++) {
        if (articlesModel[i].name == elementHref) {
            switchElementContent('#infobar-title', 'articles', 300);
            switchElementContent('#infobar-left', structureArticlesInfo(articlesModel[i]), 0);
            toggleLayoutInfobar();
            break;
        }
    }
}

// 图片重组
function resetImage() {
    if (docCookies.getItem('settingEnableImgReset') == 'false') {
        return false;
    }
    document.querySelectorAll('#articles-body img').forEach((element) => {
        const alts = element.getAttribute('alt')
            ? `<span>${element.getAttribute('alt')}</span>`
            : '';
        element.outerHTML = `<div class='imgbox'><img src='${element.getAttribute('src')}' alt='${
            element.getAttribute('alt') || ''
        }' loading='lazy' style='${element.getAttribute('style') || ''}' class='${
            element.getAttribute('class') || ''
        }'>${alts}</div>`;
    });
}

// 加载高级超链接
function loadBox() {
    if (docCookies.getItem('settingEnableAdvanceLink') == 'false') {
        return false;
    }
    loadLinkBox();
    loadMusicBox();
    loadDownloadBox();
}

function loadLinkBox() {
    document.querySelectorAll('#articles-body a[type="link-box"]').forEach((e) => {
        e.outerHTML = `
        <div class="link-box">
            <a href='${e.href}' class='no-effect' target='_blank'>
            <img src="https://screenshot.ravelloh.top/?viewport=1000x1000&cache=864000&await=1000&url=${e.href}" class="no-zoom reset">
            <div class="link-describe">
                <span class="link-name"><span class='i_small ri:link'></span> ${e.innerHTML}</span>
                <span class="one-line line-href">${e.href}</span>
            </div>
            </a>
        </div>
        `;
    });
}

function loadMusicBox() {
    document.querySelectorAll('#articles-body a[type="music-box"]').forEach((e) => {
        e.outerHTML = `
        <div class="music-box center">
            <a onclick="musicChange('${e.innerHTML}','${
                e.href
            }')" class='no-effect' target='_blank'>
            <img src="${e.getAttribute('src') || '/assets/images/music.jpg'}" class="reset no-zoom">
            <div class="music-info">
                <span class="music-name"><span class='i_small ri:music-2-fill'></span> ${
                    e.innerHTML
                }</span>
                <span class="one-line line-href">${e.getAttribute('info') || '无更多信息'}</span>
            </div>
            </a>
        </div>
        `;
    });
}

function loadDownloadBox() {
    document.querySelectorAll('#articles-body a[type="download-box"]').forEach((e) => {
        e.outerHTML = `
        <div class="link-box">
            <a onclick="setTimeout(fileDownload('${e.href}','${e.innerHTML}'))" class='no-effect'>
            <img src="/assets/images/file.png" class="no-zoom">
            <div class="link-describe">
                <span class="link-name"><span class='i_small ri:download-2-line'></span> ${e.innerHTML}</span>
                <span class="one-line line-href">${e.href}</span>
            </div>
            </a>
        </div>
        `;
    });
}

// 标题重组
function updateTitle() {
    if (docCookies.getItem('settingEnableUpdateMenu') == 'false') {
        return false;
    }
    document
        .querySelectorAll(
            '#articles-body h2 , #articles-body h3 , #articles-body h4 , #articles-body h5 , #articles-body h6',
        )
        .forEach((element) => {
            element.innerHTML = `<a href='#${element.innerText
                .replaceAll(' ', '')
                .replaceAll('-', '')}' id='${element.innerText
                .replaceAll(' ', '')
                .replaceAll('-', '')}' title='${element.innerText}'>${element.innerText}</a>`;
        });
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

// 预加载图片
function prefetchImg() {
    if (docCookies.getItem('settingEnableImgPrefetch') == 'false') {
        return false;
    }
    document.querySelectorAll('#viewmap img').forEach((element) => {
        prefetch(element.getAttribute('src'));
    });
}

// 检测元素是否可见
function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const vWidth = window.innerWidth || document.documentElement.clientWidth;
    const vHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) {
        return false;
    }
    return true;
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

// 目录高亮
function highlightMenu() {
    if (docCookies.getItem('settingEnableMenuHighlight') == 'false') {
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

// 重置筛选
function resetFilter() {
    let tagFilters = document.querySelectorAll('.articles-tags a:not(.ellipsis)');
    let classFilters = document.querySelectorAll('.class a');

    tagFilters.forEach((e) => {
        e.setAttribute('onclick', `pjaxLoad('/articles/#/tag/${e.innerHTML.toLowerCase()}')`);
    });
    classFilters.forEach((e) => {
        e.setAttribute(
            'onclick',
            `pjaxLoad('/articles/#/classification/${e.innerHTML.toLowerCase()}')`,
        );
    });
}

// 数组重排
function reorder(box, item, time = 0) {
    let itemElement = document.querySelectorAll(item);
    let innerText = '';
    itemElement = Array.from(itemElement).sort(() => {
        return Math.random() - 0.5;
    });

    itemElement.forEach((element) => {
        innerText += element.outerHTML;
    });

    switchElementContent(box, innerText, time);
}

// 文章排序
function sortArticles(mode) {
    let structure = '';
    switch (mode) {
        case 'time':
            articlesModel
                .sort((a, b) => {
                    return -collator.compare(a.time, b.time);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
        case 'time-b':
            articlesModel
                .sort((a, b) => {
                    return collator.compare(a.time, b.time);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
        case 'tag':
            articlesModel
                .sort((a, b) => {
                    return -collator.compare(a.tag.length, b.tag.length);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
        case 'tag-b':
            articlesModel
                .sort((a, b) => {
                    return collator.compare(a.tag.length, b.tag.length);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
        case 'cla':
            articlesModel
                .sort((a, b) => {
                    return -collator.compare(a.class.length, b.class.length);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
        case 'cla-b':
            articlesModel
                .sort((a, b) => {
                    return collator.compare(a.class.length, b.class.length);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
        case 'name':
            articlesModel
                .sort((a, b) => {
                    return collator.compare(a.name, b.name);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
        case 'name-b':
            articlesModel
                .sort((a, b) => {
                    return -collator.compare(a.name, b.name);
                })
                .forEach((e) => (structure += structureArticlesList(e)));
            break;
    }
    switchElementContent('.listlines', structure);
    setTimeout(() => {
        resetTagList();
    }, 300);
}
