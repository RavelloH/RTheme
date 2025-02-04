'use client';

import switchElementContent from '@/utils/switchElement';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import objectToForm from '@/utils/objectToForm';
import token from '@/utils/token';
import loadURL from '@/utils/loadURL';

let postTitle, postCategory, postTag, postName;

const initVditor = (content) => {
    window.vditor = new Vditor('vditor', {
        value: content,
        theme: 'dark',
        mode: 'ir',
        outline: {
            enable: true,
            position: 'right',
        },
        typewriterMode: true,
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

function contentEdit(props) {
    document.querySelector('#to-content-button').classList.add('block');
    document.querySelector('#to-content-button').onClick = null;

    postTitle = document.querySelector('#posttitle').value;
    postCategory = document.querySelector('#postcategory').value;
    postTag = document.querySelector('#posttag').value;
    postName = props.name;

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
                <span className='virgule center'>步骤2/3 - 更改正文内容</span>
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
        initVditor(props.content);
    }, 1000);

    localStorage.setItem('postTitle', postTitle);
    localStorage.setItem('postTag', postTag);
    localStorage.setItem('postCategory', postCategory);
    localStorage.setItem('vditorvditor', props.content);
    localStorage.setItem('postName', props.name);
}

function infoEdit() {
    switchElementContent(
        '#viewmap',
        <>
            <div className='placeholeder'></div>
            <div className='texts center' id='editor' style={{ width: '50%' }}>
                <h2 className='center'>新建文稿</h2> <br />
                <span className='virgule'>步骤3/3 - 更改文稿状态</span>
                <br />
                <br />
                <div className='center' style={{ margin: 'auto' }}>
                    <div
                        className='big-button'
                        id='publish-button'
                        onClick={() => submit('publish')}
                    >
                        <span>保存并发布</span>
                    </div>
                    <div className='big-button' id='draft-button' onClick={() => submit('draft')}>
                        <span>保存为草稿</span>
                    </div>
                </div>
            </div>
            <div className='placeholeder'></div>
        </>,
    );
}

function submit(mode) {
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

    fetch('/api/post/update', {
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
            console.log(data);
            if (data.message == '修改成功') {
                if (mode == 'publish') {
                    switchElementContent('#publish-button span', '发布成功，即将跳转...');
                    setTimeout(() => {
                        loadURL(`/posts/${postName}`);
                    }, 3000);
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
                switchElementContent('#publish-button span', '保存并发布');
                switchElementContent('#draft-button span', '保存为草稿');
                document.querySelector('#publish-button').classList.remove('block');
                document.querySelector('#draft-button').classList.remove('block');
                document.querySelector('#publish-button').onClick = () => submit('publish');
                document.querySelector('#draft-button').onClick = () => submit('draft');
            }, 3000);
        });
}

export default function Editor(props) {
    return (
        <>
            <div className='placeholeder'></div>
            <div className='texts center' id='editor' style={{ width: '50%' }}>
                <h2 className='center'>编辑文章</h2> <br />
                <span className='virgule'>步骤1/3 - 更改文稿信息</span>
                <br />
                <br />
                <div className='center' style={{ margin: 'auto' }}>
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
                                    '#update-posttitle div',
                                    '作为文章的标题，长度小于50个字符',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#update-posttitle div', '文稿标题 / Title')
                            }
                            defaultValue={props.title}
                            id='posttitle'
                        />
                        <label>
                            <span className='ri-h-1'>&nbsp;</span>
                            <span id='update-posttitle'>
                                <div>文稿标题 / Title</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='text'
                            required={true}
                            onInput={() =>
                                localStorage.setItem(
                                    'postCategory',
                                    document.getElementById('postcategory').value,
                                )
                            }
                            onFocus={() =>
                                switchElementContent(
                                    '#update-postcategory div',
                                    '可添加多项，使用空格分隔',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#update-postcategory div', '分类 / Category')
                            }
                            defaultValue={props.category}
                            id='postcategory'
                        />
                        <label>
                            <span className='ri-folder-line'>&nbsp;</span>
                            <span id='update-postcategory'>
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
                            defaultValue={props.tag}
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
                        id='to-content-button'
                        onClick={() => contentEdit(props)}
                    >
                        <span>编辑正文</span>
                    </div>
                </div>
            </div>
            <div className='placeholeder'></div>
        </>
    );
}
