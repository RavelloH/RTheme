'use client';

import token from '@/utils/token';
import { useEffect } from 'react';
import switchElementContent from '@/utils/switchElement';
import objectToForm from '@/utils/objectToForm';
import loadURL from '@/utils/loadURL';

function main() {
    const usertoken = token.getObject();
    if (!usertoken)
        loadURL(`/account/signin?redirect=${window.location.pathname}${window.location.search}```);
}

async function update() {
    document.querySelector('#update-button').classList.add('block');
    document.querySelector('#update-button').onclick = null;

    const usertoken = token.getObject();
    if (!usertoken) {
        loadURL(`/account/signin?redirect=${window.location.pathname}${window.location.search}`);
        return;
    }

    const account = usertoken.username; // 从token中获取用户名
    const password = document.querySelector('#password').value;
    const newpassword = document.querySelector('#newpassword').value;
    const confirmpassword = document.querySelector('#confirmpassword').value;

    if (!password || password.length < 6) {
        switchElementContent('#update-button span', '当前密码长度不能小于6位');
        setTimeout(() => {
            document.querySelector('#update-button').classList.remove('block');
            document.querySelector('#update-button').onclick = () => update();
            switchElementContent('#update-button span', '提交');
        }, 5000);
        return;
    }

    if (!newpassword || newpassword.length < 6) {
        switchElementContent('#update-button span', '新密码长度不能小于6位');
        setTimeout(() => {
            document.querySelector('#update-button').classList.remove('block');
            document.querySelector('#update-button').onclick = () => update();
            switchElementContent('#update-button span', '提交');
        }, 5000);
        return;
    }

    if (newpassword !== confirmpassword) {
        switchElementContent('#update-button span', '两次输入的新密码不一致');
        setTimeout(() => {
            document.querySelector('#update-button').classList.remove('block');
            document.querySelector('#update-button').onclick = () => update();
            switchElementContent('#update-button span', '提交');
        }, 5000);
        return;
    }

    switchElementContent(
        '#update-button span',
        <span>
            <span className='circle-loader'></span>
        </span>,
    );

    fetch('/api/user/password/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer ' + token.get(),
        },
        body: objectToForm({
            account: account,
            password: password,
            newpassword: newpassword,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === '修改成功') {
                switchElementContent('#update-button span', '密码修改成功，请重新登录');
                token.clear();
                setTimeout(() => {
                    loadURL('/account/signin');
                }, 3000);
            } else {
                switchElementContent('#update-button span', data.message || '修改失败');
            }
        })
        .catch((e) => {
            switchElementContent('#update-button span', '无法与服务器建立连接');
        })
        .finally(() => {
            setTimeout(() => {
                document.querySelector('#update-button').classList.remove('block');
                document.querySelector('#update-button').onclick = () => update();
                switchElementContent('#update-button span', '提交');
            }, 5000);
        });
}

export default function PasswordReset() {
    useEffect(() => {
        main();
    });

    return (
        <>
            <div className='placeholder'></div>
            <div className='texts overflow center'>
                <br />
                <br />
                <h2 className='center'>Password / 修改密码</h2> <br />
                <br />
                <div className='center' style={{ margin: 'auto' }}>
                    <div className='form-control'>
                        <input
                            type='password'
                            maxLength={4096}
                            minLength={6}
                            required={true}
                            onFocus={() =>
                                switchElementContent('#update-password div', '请输入您的当前密码')
                            }
                            onBlur={() =>
                                switchElementContent(
                                    '#update-password div',
                                    '当前密码 / Current Password',
                                )
                            }
                            id='password'
                        />
                        <label>
                            <span className='ri-lock-line'>&nbsp;</span>
                            <span id='update-password'>
                                <div>当前密码 / Current Password</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='password'
                            maxLength={4096}
                            minLength={6}
                            required={true}
                            onFocus={() =>
                                switchElementContent(
                                    '#update-newpassword div',
                                    '请输入新密码，至少6位字符',
                                )
                            }
                            onBlur={() =>
                                switchElementContent(
                                    '#update-newpassword div',
                                    '新密码 / New Password',
                                )
                            }
                            id='newpassword'
                        />
                        <label>
                            <span className='ri-lock-password-line'>&nbsp;</span>
                            <span id='update-newpassword'>
                                <div>新密码 / New Password</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='password'
                            maxLength={50}
                            minLength={6}
                            required={true}
                            onFocus={() =>
                                switchElementContent(
                                    '#update-confirmpassword div',
                                    '请再次输入新密码',
                                )
                            }
                            onBlur={() =>
                                switchElementContent(
                                    '#update-confirmpassword div',
                                    '确认新密码 / Confirm Password',
                                )
                            }
                            id='confirmpassword'
                        />
                        <label>
                            <span className='ri-lock-password-line'>&nbsp;</span>
                            <span id='update-confirmpassword'>
                                <div>确认新密码 / Confirm Password</div>
                            </span>
                        </label>
                    </div>
                    <div className='big-button' id='update-button' onClick={() => update()}>
                        <span>提交</span>
                    </div>
                </div>
                <br />
                <br />
                <div className='full center textarea' style={{ margin: '0 auto' }}></div>
            </div>
            <div className='placeholder'></div>
        </>
    );
}
