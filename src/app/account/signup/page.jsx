'use client';
import switchElementContent from '@/utils/switchElement';
import { useEffect } from 'react';
import cookie from '@/assets/js/lib/cookie';
import token from '@/utils/token';
import message from '@/utils/message';
import config from '../../../../config';
import objectToForm from '@/utils/objectToForm';
import analyzeURL from '@/utils/analyzeURL';
import loadURL from '@/utils/loadURL';

function main() {
    if (cookie.getItem('usertoken')) {
        loadURL(`/user?uid=${token.read('uid')}`);
        return;
    }
    fetch(`/api/search/post`)
        .then((response) => response.json())
        .then((data) => {
            if (data) {
                document.querySelector('#signup-button').classList.remove('block');
                document.querySelector('#signup-button').onclick = () => signin();
                switchElementContent('#signup-button span', '注册');
            } else {
                message.error('平台运行异常，请稍后重试');
                switchElementContent('#signup-button span', '平台运行异常，刷新页面以重试');
                document.querySelector('#signup-button').onclick = () => pjaxLoad('#');
            }
        })
        .catch((e) => {
            message.error('无法与注册服务器建立连接，请稍后重试', 12000);
            switchElementContent('#signup-button span', '刷新页面以重试');
            document.querySelector('#signup-button').onclick = () => pjaxLoad('#');
        });
}

function signin() {
    switchElementContent('#signup-button span', '<span className="circle-loader"></span>');
    document.querySelector('#signup-button').classList.add('block');
    document.querySelector('#signup-button').onclick = null;

    if (!document.querySelector('#signup-username').value) {
        switchElementContent('#signup-button span', '请输入用户名');
        setTimeout(() => {
            document.querySelector('#signup-button').classList.remove('block');
            document.querySelector('#signup-button').onclick = () => signin();
            switchElementContent('#signup-button span', '注册');
        }, 5000);
        return false;
    }

    if (!document.querySelector('#signup-password').value) {
        switchElementContent('#signup-button span', '请输入密码');
        setTimeout(() => {
            document.querySelector('#signup-button').classList.remove('block');
            document.querySelector('#signup-button').onclick = () => signin();
            switchElementContent('#signup-button span', '注册');
        }, 5000);
        return false;
    }

    if (!document.querySelector('#signup-email').value) {
        switchElementContent('#signup-button span', '请输入邮箱');
        setTimeout(() => {
            document.querySelector('#signup-button').classList.remove('block');
            document.querySelector('#signup-button').onclick = () => signin();
            switchElementContent('#signup-button span', '注册');
        }, 5000);
        return false;
    }

    if (!checkEmail()) {
        switchElementContent('#signup-button span', '邮箱格式不正确');
        setTimeout(() => {
            document.querySelector('#signup-button').classList.remove('block');
            document.querySelector('#signup-button').onclick = () => signin();
            switchElementContent('#signup-button span', '注册');
        }, 5000);
        return false;
    }

    if (!checkUsername()) {
        switchElementContent('#signup-button span', '用户名格式不正确');
        setTimeout(() => {
            document.querySelector('#signup-button').classList.remove('block');
            document.querySelector('#signup-button').onclick = () => signin();
            switchElementContent('#signup-button span', '注册');
        }, 5000);
        return false;
    }

    if (!checkPassword()) {
        switchElementContent('#signup-button span', '密码格式不正确');
        setTimeout(() => {
            document.querySelector('#signup-button').classList.remove('block');
            document.querySelector('#signup-button').onclick = () => signin();
            switchElementContent('#signup-button span', '注册');
        }, 5000);
        return false;
    }

    fetch('/api/user/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: objectToForm({
            username: document.querySelector('#signup-username').value,
            nickname: document.querySelector('#signup-username').value,
            email: document.querySelector('#signup-email').value,
            password: document.querySelector('#signup-password').value,
            allowMessage: document.querySelector('#check-allow-send-messages').checked,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message == '注册成功') {
                switchElementContent('#signup-button span', '注册成功，即将跳转至登录');
                setTimeout(() => {
                    if (analyzeURL(window.location.href, 'redirect') !== '') {
                        loadURL(
                            '/account/signin?redirect=' +
                                analyzeURL(window.location.href, 'redirect'),
                        );
                    } else {
                        loadURL('/account/signin');
                    }
                }, 3000);
            } else {
                switchElementContent('#signup-button span', data.message);
            }
        })
        .catch((e) => {
            console.error(e);
            switchElementContent('#signup-button span', '无法与注册服务器建立连接');
        })
        .finally(() => {
            setTimeout(() => {
                document.querySelector('#signup-button').classList.remove('block');
                document.querySelector('#signup-button').onclick = () => signin();
                switchElementContent('#signup-button span', '注册');
            }, 5000);
        });
}

function checkPassword() {
    if (
        parseInt(document.querySelector('#signup-password').value.length) < 6 ||
        parseInt(document.querySelector('#signup-password').value.length) > 4096
    ) {
        // document.querySelector('#signup-password').setAttribute('invalid', '')
        switchElementContent('#password-tip div', '密码应介于6-4096位之间');
        return false;
    }
    // document.querySelector('#signup-password').removeAttribute('invalid');
    switchElementContent('#password-tip div', '密码 / Password');
    return true;
}

function checkUsername() {
    if (
        parseInt(document.querySelector('#signup-username').value.length) < 5 ||
        parseInt(document.querySelector('#signup-username').value.length) > 10
    ) {
        // document.querySelector('#signup-password').setAttribute('invalid', '')
        switchElementContent('#username-tip div', '用户名应介于5-10位之间');
        return false;
    }
    if (!/^[a-z0-9_]+$/.test(document.querySelector('#signup-username').value)) {
        switchElementContent('#username-tip div', '用户名应仅由英文小写字母及数字或下划线组成');
        return false;
    }
    // document.querySelector('#signup-password').removeAttribute('invalid');
    switchElementContent('#username-tip div', '用户名 / Username');
    return true;
}

function checkEmail() {
    if (
        !/\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}/.test(
            document.querySelector('#signup-email').value,
        )
    ) {
        switchElementContent('#email-tip div', '邮箱格式错误');
        return false;
    }
    switchElementContent('#email-tip div', '邮箱 / Email');
    return true;
}

export default function Signup() {
    useEffect(() => {
        main();
    });
    return (
        <>
            <div className='texts overflow half'>
                <br />
                <br />
                <div id='signup-form'>
                    <div className='form-control'>
                        <input
                            type='text'
                            required={true}
                            id='signup-username'
                            minLength={2}
                            maxLength={10}
                            onInput={() => checkUsername()}
                        />
                        <label>
                            <span className='ri-user-3-line'>&nbsp;</span>
                            <span id='username-tip'>
                                <div>用户名 - Username</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='text'
                            required={true}
                            id='signup-email'
                            onInput={() => checkEmail()}
                        />
                        <label>
                            <span className='ri-mail-line'>&nbsp;</span>
                            <span id='email-tip'>
                                <div>邮箱 - Email</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='password'
                            required={true}
                            onInput={() => checkPassword()}
                            id='signup-password'
                        />
                        <label>
                            <span className='ri-lock-password-line'>&nbsp;</span>
                            <span id='password-tip'>
                                <div>密码 / Password</div>
                            </span>
                        </label>
                    </div>

                    <div className='checkbox'>
                        <label className='checkbox-label'>
                            <input
                                type='checkbox'
                                className='checkbox-input'
                                id='check-allow-send-messages'
                            />
                            <span className='checkbox-name'></span>
                            允许向邮箱发送有关通知
                        </label>
                    </div>

                    <div className='form-control'>
                        <div className='big-button block' id='signup-button'>
                            <span>
                                <span className='circle-loader'></span>
                            </span>
                        </div>
                        <div className='flex-items'>
                            <span>
                                已有账户？<a href='/account/signin/'>立即登录&gt;</a>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className='placeholder'></div>
            <div className='texts overflow'>
                <br />
                <h4>Sign Up - 注册</h4>
                <h3>RPlatform.</h3>
                <span className='virgule'>@ {config.siteName}</span>
                <br />
                <p>
                    RPlatform是一个与RTheme深度集成的在线内容平台，
                    <br />
                    可用于为RTheme提供文章、评论、用户管理，访问统计等功能。
                    <br />
                    此站点已接入此平台。
                    <br />
                    简洁、高效、安全，是此平台的设计初衷。
                    <br />
                    现在登入，即刻体验。
                </p>
                <p>
                    我们使用现代加密算法Argon2id单向加盐以不可逆的处理密码，
                    <br />
                    并使用自研Shuffler函数对输入的密码进行乱序重组预处理，以保证你的账号安全。
                    <br />
                </p>
            </div>
        </>
    );
}
