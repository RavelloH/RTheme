'use client';

import config from '../../config';

import { useEffect } from 'react';

export const metadata = {
    title: '500 Interal server error | ' + config.siteName,
    description: '错误：内部服务器发生故障',
};

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <>
            <div className='texts'>
                <h2>ERROR...</h2>
                <h4>500 Inter server error.</h4>
                <span className='virgule' id='errorMessage'>
                    内部服务器发生故障。
                </span>
                <div className='button-list'>
                    <a className='button' href='javascript:history.back(-1);'>
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
