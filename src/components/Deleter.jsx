'use client';

import switchElementContent from '@/utils/switchElement';
import objectToForm from '@/utils/objectToForm';
import token from '@/utils/token';

function deletePost(name) {
    document.querySelector('#delete-button').onClick = null;
    document.querySelector('#undo-button').onClick = null;
    document.querySelector('#delete-button').classList.add('block');
    document.querySelector('#undo-button').classList.add('block');
    document.querySelector('#delete-button span').innerHTML = "<div class='circle-loader'></div>";

    fetch('/api/post/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token.get(),
        },
        body: objectToForm({
            name: name,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message == '删除成功') {
                switchElementContent('#delete-button span', '删除成功，将跳转至文稿索引页');
                setTimeout(() => {
                    window.location.href = `/posts/`;
                }, 3000);
            } else {
                switchElementContent('#delete-button span', data.message);

                setTimeout(() => {
                    switchElementContent('#delete-button span', '确认删除');
                    switchElementContent('#undo-button span', '保存');
                    document.querySelector('#delete-button').classList.remove('block');
                    document.querySelector('#undo-button').classList.remove('block');
                    document.querySelector('#delete-button').onClick = () => submit('publish');
                    document.querySelector('#undo-button').onClick = () => submit('draft');
                }, 3000);
            }
        })
        .catch((e) => {
            if (mode == 'publish') {
                switchElementContent('#delete-button span', '发布失败，请检查网络连接');
                console.log(e);
            }
            if (mode == 'draft') {
                switchElementContent('#undo-button span', '保存失败，请检查网络连接');
                console.log(e);
            }
            setTimeout(() => {
                switchElementContent('#delete-button span', '保存并发布');
                switchElementContent('#undo-button span', '保存为草稿');
                document.querySelector('#delete-button').classList.remove('block');
                document.querySelector('#undo-button').classList.remove('block');
                document.querySelector('#delete-button').onClick = () => submit('publish');
                document.querySelector('#undo-button').onClick = () => submit('draft');
            }, 3000);
        });
}

export default function Deleter(props) {
    return (
        <>
            <div className='placeholeder'></div>
            <div className='texts center' id='editor'>
                <h2 className='center'>删除文章</h2> <br />
                <span className='virgule'>
                    你即将删除标题为《{props.title}》的文章。此操作无法恢复！
                </span>
                <br />
                <br />
                <div className='center' style={{ margin: 'auto' }}>
                    <div
                        className='big-button'
                        id='delete-button'
                        onClick={() => deletePost(props.name)}
                    >
                        <span>确认删除</span>
                    </div>
                    <div
                        className='big-button'
                        id='undo-button'
                        onClick={() => window.history.back()}
                    >
                        <span>取消</span>
                    </div>
                </div>
            </div>
            <div className='placeholeder'></div>
        </>
    );
}
