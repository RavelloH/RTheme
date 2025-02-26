'use client';
import { useEffect, useState } from 'react';
import token from '@/utils/token';
import switchElementContent from '@/utils/switchElement';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import objectToForm from '@/utils/objectToForm';
import loadURL from '@/utils/loadURL';

let postName, postTitle;

function init() {
    if (!token.get()) {
        switchElementContent('#editor', <h2>请登录后查看此页面</h2>);
        return;
    }

    if (token.read('role') !== 'ADMIN' && token.read('role') !== 'MANAGER') {
        switchElementContent('#editor', <h2>你的权限不足</h2>);
        return;
    }

    document.querySelector('#postname').value = localStorage.getItem('postName');
    document.querySelector('#posttitle').value = localStorage.getItem('postTitle');
}

function contentEdit() {
    document.querySelector('#to-content-button').classList.add('block');
    document.querySelector('#to-content-button').onClick = null;

    postName = document.querySelector('#postname').value;
    postTitle = document.querySelector('#posttitle').value;

    if (postName.length < 1 || postName.length > 50) {
        switchElementContent('#to-content-button span', <span>文稿名长度应在1-50之间</span>);
        setTimeout(() => {
            switchElementContent('#to-content-button span', <span>下一步</span>);
            document.querySelector('#to-content-button').classList.remove('block');
            document.querySelector('#to-content-button').onClick = contentEdit;
        }, 3000);
        return;
    }

    if (postTitle.length < 1 || postTitle.length > 50) {
        switchElementContent('#to-content-button span', <span>文稿标题长度应在1-50之间</span>);
        setTimeout(() => {
            switchElementContent('#to-content-button span', <span>下一步</span>);
            document.querySelector('#to-content-button').classList.remove('block');
            document.querySelector('#to-content-button').onClick = contentEdit;
        }, 3000);
        return;
    }

    switchElementContent(
        '#viewmap',
        <>
            <div className='texts full overflow' id='editor'>
                <span className='virgule center'>步骤2/3 - 编辑正文内容</span>
                <br />
                <br />
                <div style={{ margin: 'auto' }}>
                    <div id='vditor' style={{ width: '100%' }}></div>
                </div>
                <br />
                <div className='big-button' id='to-content-button' onClick={() => infoEdit()}>
                    <span>下一步</span>
                </div>
            </div>
        </>,
    );

    setTimeout(() => {
        initVditor();
    }, 1000);

    localStorage.setItem('postName', postName);
    localStorage.setItem('postTitle', postTitle);
}

function infoEdit() {
    switchElementContent(
        '#viewmap',
        <>
            <div className='placeholeder'></div>
            <div className='texts center' id='editor' style={{ width: '50%' }}>
                <h2 className='center'>新建文稿</h2> <br />
                <span className='virgule'>步骤3/3 - 补充索引信息</span>
                <br />
                <br />
                <div className='center' style={{ margin: 'auto' }}>
                    <div className='form-control'>
                        <input
                            type='text'
                            required={true}
                            onFocus={() =>
                                switchElementContent(
                                    '#create-category div',
                                    '可添加多个，以空格分隔',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#create-category div', '分类 / Category')
                            }
                            onInput={() =>
                                localStorage.setItem(
                                    'postCategory',
                                    document.querySelector('#postcategory').value,
                                )
                            }
                            id='postcategory'
                        />
                        <label>
                            <span className='ri-folder-line'>&nbsp;</span>
                            <span id='create-category'>
                                <div>分类 / Category</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='text'
                            required={true}
                            onFocus={() =>
                                switchElementContent('#create-tag div', '可添加多个，以空格分隔')
                            }
                            onBlur={() => switchElementContent('#create-tag div', '标签 / Tag')}
                            onInput={() =>
                                localStorage.setItem(
                                    'postTag',
                                    document.querySelector('#posttag').value,
                                )
                            }
                            id='posttag'
                        />
                        <label>
                            <span className='ri-price-tag-3-line'>&nbsp;</span>
                            <span id='create-tag'>
                                <div>标签 / Tag</div>
                            </span>
                        </label>
                    </div>

                    <div
                        className='big-button'
                        id='publish-button'
                        onClick={() => submit('publish')}
                    >
                        <span>发布</span>
                    </div>
                    <div className='big-button' id='draft-button' onClick={() => submit('draft')}>
                        <span>保存为草稿</span>
                    </div>
                </div>
            </div>
            <div className='placeholeder'></div>
        </>,
    );

    setTimeout(() => {
        document.querySelector('#postcategory').value = localStorage.getItem('postCategory');
        document.querySelector('#posttag').value = localStorage.getItem('postTag');
    }, 500);
}

const initVditor = (language) => {
    window.vditor = new Vditor('vditor', {
        theme: 'dark',
        mode: 'ir',
        outline: {
            enable: true,
            position: 'right',
        },
        typewriterMode: true,
        placeholder: '注意：正文中请使用二级及以上标题，勿使用一级标题。',
        preview: {
            markdown: {
                toc: true,
                mark: true,
                footnotes: true,
                autoSpace: true,
            },
        },
        toolbarConfig: {
            pin: true,
        },
        counter: {
            enable: true,
            type: 'text',
            max: 100000,
        },
        tab: '\t',
        height: '60vh',
        hint: {
            parse: false,
            emoji: false,
        },
    });
};

function submit(mode) {
    localStorage.setItem('posttag', document.getElementById('posttag').value);
    localStorage.setItem('postcategory', document.getElementById('postcategory').value);

    document.querySelector('#publish-button').classList.add('block');
    document.querySelector('#draft-button').classList.add('block');
    document.querySelector('#publish-button').onClick = null;
    document.querySelector('#draft-button').onClick = null;
    if (mode == 'publish')
        document.querySelector('#publish-button span').innerHTML =
            "<div class='circle-loader'></div>";

    if (mode == 'draft')
        document.querySelector('#draft-button span').innerHTML =
            "<div class='circle-loader'></div>";

    fetch('/api/post/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token.get(),
        },
        body: objectToForm({
            name: localStorage.getItem('postName'),
            title: localStorage.getItem('postTitle'),
            content: window.vditor.getValue(),
            category: localStorage.getItem('postCategory'),
            tag: localStorage.getItem('postTag'),
            draft: mode === 'draft',
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message == '创建成功') {
                if (mode == 'publish') {
                    switchElementContent('#publish-button span', '发布成功，正在更新站点...');

                    fetch('/api/site/build', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer ' + token.get(),
                        },
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            switchElementContent(
                                '#publish-button span',
                                '站点更新成功，即将跳转...',
                            );
                            setTimeout(() => {
                                loadURL(`/posts/${postName}`);
                            }, 1000);
                        })
                        .catch((error) => {
                            console.error('站点更新失败:', error);
                            switchElementContent(
                                '#publish-button span',
                                '站点更新失败，即将跳转...',
                            );
                            setTimeout(() => {
                                loadURL(`/posts/${postName}`);
                            }, 1000);
                        });
                }
                if (mode == 'draft') {
                    switchElementContent('#draft-button span', '保存成功，即将跳转...');
                    setTimeout(() => {
                        loadURL(`/manage/posts/draft/${postName}`);
                    }, 3000);
                }
                localStorage.clear();
                window.vditor.destroy();
            } else {
                if (mode == 'publish') {
                    switchElementContent('#publish-button span', data.message);
                }
                if (mode == 'draft') {
                    switchElementContent('#draft-button span', data.message);
                }
                setTimeout(() => {
                    switchElementContent('#publish-button span', '发布');
                    switchElementContent('#draft-button span', '保存');
                    document.querySelector('#publish-button').classList.remove('block');
                    document.querySelector('#draft-button').classList.remove('block');
                    document.querySelector('#publish-button').onClick = () => submit('publish');
                    document.querySelector('#draft-button').onClick = () => submit('draft');
                }, 3000);
            }
        })
        .catch((e) => {
            if (mode == 'publish') {
                switchElementContent('#publish-button span', '发布失败，请检查网络连接');
                console.log(e);
            }
            if (mode == 'draft') {
                switchElementContent('#draft-button span', '保存失败，请检查网络连接');
                console.log(e);
            }
            setTimeout(() => {
                switchElementContent('#publish-button span', '发布');
                switchElementContent('#draft-button span', '保存');
                document.querySelector('#publish-button').classList.remove('block');
                document.querySelector('#draft-button').classList.remove('block');
                document.querySelector('#publish-button').onClick = () => submit('publish');
                document.querySelector('#draft-button').onClick = () => submit('draft');
            }, 3000);
        });
}

export default function CreatePosts() {
    useEffect(() => {
        init();
    });
    return (
        <>
            <div className='placeholeder'></div>
            <div className='texts center' id='editor' style={{ width: '50%' }}>
                <h2 className='center'>新建文稿</h2> <br />
                <span className='virgule'>步骤1/3 - 提供基本信息</span>
                <br />
                <br />
                <div className='center' style={{ margin: 'auto' }}>
                    <div className='form-control'>
                        <input
                            type='text'
                            maxLength={50}
                            minLength={1}
                            required={true}
                            onFocus={() =>
                                switchElementContent(
                                    '#create-postname div',
                                    '作为文稿的路径名，仅允许输入小写英文字符、阿拉伯数字和连字符(-)，长度小于50个字符',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#create-postname div', '文稿名 / Name')
                            }
                            onChange={() =>
                                localStorage.setItem(
                                    'postName',
                                    document.getElementById('postname').value,
                                )
                            }
                            id='postname'
                        />
                        <label>
                            <span className='ri-file-3-line'>&nbsp;</span>
                            <span id='create-postname'>
                                <div>文稿名 / Name</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='text'
                            maxLength={50}
                            minLength={1}
                            required={true}
                            onInput={() =>
                                localStorage.setItem(
                                    'postTitle',
                                    document.getElementById('posttitle').value,
                                )
                            }
                            onFocus={() =>
                                switchElementContent(
                                    '#create-posttitle div',
                                    '作为文章的标题，长度小于50个字符',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#create-posttitle div', '文稿标题 / Title')
                            }
                            id='posttitle'
                        />
                        <label>
                            <span className='ri-h-1'>&nbsp;</span>
                            <span id='create-posttitle'>
                                <div>文稿标题 / Title</div>
                            </span>
                        </label>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                        <span>
                            <span className='ri-alert-line'></span>{' '}
                            注意：文稿名在发布后不支持再次修改
                        </span>
                        <br />
                        <span>
                            <span className='ri-information-line'></span>{' '}
                            最佳的文稿名命名方式是文稿标题的英文翻译并替换空格为连字符。如:(我的文章
                            -&gt; my-post)
                        </span>
                    </div>

                    <div
                        className='big-button'
                        id='to-content-button'
                        onClick={() => contentEdit()}
                    >
                        <span>下一步</span>
                    </div>
                </div>
            </div>
            <div className='placeholeder'></div>
        </>
    );
}
