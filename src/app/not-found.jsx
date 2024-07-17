'use client';

import config from '../../config';

export const metadata = {
    title: '404 Not Found | ' + config.siteName,
    description: '发生错误： 请求的文件未在服务器中找到',
};

export default function About() {
    return (
        <>
            <div className='texts'>
                <h2>ERROR...</h2>
                <h3>404 Not Found</h3>
                <span className='virgule' id='errorMessage'>
                    请求的文件未在服务器中找到。
                </span>
                <div className='button-list'>
                    <a className='button' href='#back' onClick={() => window.history.back()}>
                        BACK / 返回 &gt;
                    </a>{' '}
                    <a className='button' href='/'>
                        HOME / 主页 &gt;
                    </a>
                </div>
            </div>
            <div>
                <span className='i_large ri-alert-line'></span>
            </div>
        </>
    );
}
