'use client';

/*
 * <Search />
 * WITH title remoteOutput localOutput
 */

import switchElementContent from '@/utils/switchElement';
import HTML from '@/utils/HTML';
import log from '@/utils/log';

let remoteOutputOrigin,
    localOutputOrigin,
    titleOrigin,
    searchWorker,
    remoteOutput,
    localOutput,
    title,
    resultElement,
    resultOrigin,
    searchWord,
    searchTimer;

function getSearchData(keyword) {
    log.info('<search>', keyword);
    switchElementContent(remoteOutput, '正在请求远程Search服务器...');
    return new Promise((resolve) => {
        fetch('/api/search/post?q=' + keyword)
            .then((res) => res.json())
            .then((data) => {
                switchElementContent(remoteOutput, '已连接至远程Search服务器', 300);
                resolve(data);
            })
            .catch((err) => switchElementContent(remoteOutput, '请求失败，请重试', 300));
    });
}

function formatDate(dateStr) {
    var date = new Date(dateStr);
    var year = date.getFullYear();
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var day = date.getDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function createCategory(arr) {
    const elements = arr.map((item, index) => (
        <a key={index} href={'/categories/' + item.name}>
            {item.name}
        </a>
    ));
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [<span key={index}>/</span>, element];
        }
        return element;
    });
    return <sapn className='class'>{joinedElements}</sapn>;
}

function createTag(arr) {
    const elements = arr.map((item, index) => (
        <a key={index} href={'/tags/' + item.name}>
            {item.name}
        </a>
    ));
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [element];
        }
        return element;
    });
    return <p className='articles-tags'>{joinedElements}</p>;
}

function search(keyword) {
    if (typeof searchTimer !== 'undefined') {
        clearTimeout(searchTimer);
    }
    if (keyword.length < 2) {
        switchElementContent(localOutput, '请输入至少两个字符', 300);
        return;
    } else {
        switchElementContent(localOutput, '启动查询进程...', 300);
    }
    searchTimer = setTimeout(function () {
        let start = new Date().getTime();
        if (keyword == '') {
            switchElementContent(resultElement, resultOrigin, 100);
            return false;
        }

        searchWord = HTML.decode(keyword);
        getSearchData(keyword).then((data) => {
            if (data.length == 0) {
                switchElementContent(
                    resultElement,
                    <h3 className='center'>
                        <span className='ri-filter-off-line'></span> 未找到有关内容
                    </h3>,
                    100,
                );
                switchElementContent(localOutput, '无结果', 300);
                return;
            }
            if (typeof searchWorker == 'undefined') {
                searchWorker = new Worker(URL('../utils/worker/search.worker.js', import.meta.url));
            }
            searchWorker.onmessage = (result) => {
                let end = new Date().getTime();
                let data = result.data;
                switchElementContent(
                    localOutput,
                    `查询操作找到${data.length}个结果，用时${end - start}MS`,
                    300,
                );

                let resultHTML = [];
                data.forEach((post, index) => {
                    resultHTML.push(
                        <div className='listprogram' key={index} style={{ '--i': index + 1 }}>
                            <article>
                                <span className='article-name'>
                                    <h4>
                                        <a href={'/posts/' + post.name}>{post.title}</a>
                                    </h4>
                                </span>
                                <div className='articles-info'>
                                    <span className='ri-time-line'></span>{' '}
                                    <time>{formatDate(post.createdAt)}</time> {' • '}
                                    <span className='ri-archive-line'></span>
                                    {createCategory(post.category)}
                                </div>
                                {createTag(post.tag)}
                                <div className='search-result-context'>
                                    <span className='ri-file-list-2-line'></span> {post.content}
                                </div>
                            </article>
                            <hr />
                        </div>,
                    );
                });
                switchElementContent(resultElement, resultHTML, 0);
            };
            searchWorker.postMessage([data, searchWord]);
        });
    }, 1000);
}

function searchInit(props) {
    if (!titleOrigin) {
        titleOrigin = document.querySelector(props.title).innerHTML;
        remoteOutputOrigin = document.querySelector(props.remoteOutput).innerHTML;
        localOutputOrigin = document.querySelector(props.localOutput).innerHTML;
        resultOrigin = document.querySelector(props.result).innerHTML;
        title = props.title;
        remoteOutput = props.remoteOutput;
        localOutput = props.localOutput;
        resultElement = props.result;
    }
    switchElementContent(props.title, 'SEARCH / 索引器', 400);
    switchElementContent(props.remoteOutput, '正在测试与远程Search服务器的连接...');
    fetch('/api/search/post')
        .then((response) => response.json())
        .then((res) => {
            switchElementContent(remoteOutput, '已连接至远程Search服务器');
        })
        .catch((err) => {
            switchElementContent(remoteOutput, '无法连接至远程Search服务器');
        });
    if (typeof searchWorker == 'undefined') {
        switchElementContent(props.localOutput, '正在连接至本地Search Worker...');
        searchWorker = new Worker(new URL('../utils/worker/search.worker.js', import.meta.url));
        let workerChecker = setInterval(() => {
            if (typeof searchWorker !== 'undefined') {
                setTimeout(
                    () => switchElementContent(props.localOutput, '已连接至本地Search Worker'),
                    300,
                );
                clearInterval(workerChecker);
            }
        }, 200);
    } else {
        switchElementContent(props.localOutput, '已连接至本地Search Worker');
    }
}

function searchClose(props) {
    setTimeout(() => {
        switchElementContent(props.title, titleOrigin, 400);
        switchElementContent(props.remoteOutput, remoteOutputOrigin);
        switchElementContent(props.localOutput, localOutputOrigin);
        switchElementContent(props.result, resultOrigin);
    }, 500);
}

export default function Search(props) {
    return (
        <div className='form-control'>
            <input
                type='search'
                required={true}
                onInput={() => search(document.querySelector('#search-bar').value)}
                onFocus={() => searchInit(props)}
                onBlur={() => searchClose(props)}
                id='search-bar'
            />
            <label>
                <span className='ri-search-2-line' style={{ '--i': 1 }}>
                    &nbsp;
                </span>
                <span style={{ '--i': 2 }}>搜</span>
                <span style={{ '--i': 3 }}>索</span>
                <span style={{ '--i': 4 }}>文</span>
                <span style={{ '--i': 5 }}>章</span>
                <span style={{ '--i': 6 }}>全</span>
                <span style={{ '--i': 7 }}>文</span>
                <span style={{ '--i': 8 }}>.</span>
                <span style={{ '--i': 9 }}>.</span>
                <span style={{ '--i': 10 }}>.</span>
            </label>
        </div>
    );
}
