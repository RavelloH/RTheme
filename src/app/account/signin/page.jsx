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
    if (cookie.getItem('username')) {
        document.querySelector('#login-username').value = cookie.getItem('username');
    }
    fetch(`/api/search/post`)
        .then((response) => response.json())
        .then((data) => {
            if (data) {
                document.querySelector('#login-button').classList.remove('block');
                document.querySelector('#login-button').onclick = () => signin();
                switchElementContent('#login-button span', '登录');
            } else {
                message.error('平台运行异常，请稍后重试');
                switchElementContent('#login-button span', '平台运行异常，刷新页面以重试');
                document.querySelector('#login-button').onclick = () => pjaxLoad('#');
            }
        })
        .catch((e) => {
            message.error('无法与登录服务器建立连接，请稍后重试', 12000);
            switchElementContent('#login-button span', '刷新页面以重试');
            document.querySelector('#login-button').onclick = () => (window.location.href = '#');
            console.log(e);
        });
}

function signin() {
    document.querySelector('#login-button').classList.add('block');
    document.querySelector('#login-button').onclick = null;

    if (!document.querySelector('#login-username').value) {
        switchElementContent('#login-button span', '请输入用户名/邮箱');
        setTimeout(() => {
            document.querySelector('#login-button').classList.remove('block');
            document.querySelector('#login-button').onclick = () => signin();
            switchElementContent('#login-button span', '登录');
        }, 5000);
        return false;
    }

    if (!document.querySelector('#login-password').value) {
        switchElementContent('#login-button span', '请输入密码');
        setTimeout(() => {
            document.querySelector('#login-button').classList.remove('block');
            document.querySelector('#login-button').onclick = () => signin();
            switchElementContent('#login-button span', '登录');
        }, 5000);
        return false;
    }

    if (!document.querySelector('#login-time').value) {
        switchElementContent('#login-button span', '请输入登录保持时间');
        setTimeout(() => {
            document.querySelector('#login-button').classList.remove('block');
            document.querySelector('#login-button').onclick = () => signin();
            switchElementContent('#login-button span', '登录');
        }, 5000);
        return false;
    }
    switchElementContent('#login-button span', <span className='circle-loader'></span>);

    fetch('/api/user/authorize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: objectToForm({
            account: document.querySelector('#login-username').value,
            password: document.querySelector('#login-password').value,
            expiredTime: document.querySelector('#login-time').value + 'h',
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.token) {
                token.write(data.token, document.querySelector('#login-time').value * 60 * 60);
                switchElementContent('#login-button span', '登录成功，即将跳转');
                // 处理本地存储
                if (document.querySelector('#check-keep-token-refresh').checked) {
                    // setting('EnableTokenAutorefresh', 'true');
                }
                if (document.querySelector('#remember-account').checked) {
                    cookie.setItem('username', data.info.username, Infinity);
                }

                setTimeout(() => {
                    if (analyzeURL(window.location.href, 'redirect') !== '') {
                        loadURL(analyzeURL(window.location.href, 'redirect'));
                    } else {
                        loadURL(`/user?uid=${token.read('uid')}`);
                    }
                }, 3000);
            } else {
                switchElementContent('#login-button span', data.message);
            }
        })
        .catch((e) => {
            switchElementContent('#login-button span', '无法与登录服务器建立连接');
            console.log(e);
        })
        .finally(() => {
            setTimeout(() => {
                document.querySelector('#login-button').classList.remove('block');
                document.querySelector('#login-button').onclick = () => signin();
                switchElementContent('#login-button span', '登录');
            }, 5000);
        });
}

function checkPassword() {
    if (
        parseInt(document.querySelector('#login-password').value.length) < 6 ||
        parseInt(document.querySelector('#login-password').value.length) > 4096
    ) {
        // document.querySelector('#login-password').setAttribute('invalid', '')
        switchElementContent('#password-tip div', '密码应介于6-4096位之间');
        return false;
    }
    // document.querySelector('#login-password').removeAttribute('invalid');
    switchElementContent('#password-tip div', '密码 / Password');
    return true;
}

export default function Signin() {
    useEffect(() => {
        main();
    });
    return (
        <>
            <div className='texts overflow half'>
                <br />
                <br />
                <div id='signin-form'>
                    <div className='form-control'>
                        <input type='text' required={true} id='login-username' minLength={2} />
                        <label>
                            <span className='ri-user-3-line'>&nbsp;</span>
                            <span>用户名 / 邮箱 - Username / email</span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='password'
                            required={true}
                            onInput={() => checkPassword()}
                            id='login-password'
                        />
                        <label>
                            <span className='ri-lock-password-line'>&nbsp;</span>
                            <span id='password-tip'>
                                <div>密码 / Password</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='number'
                            required={true}
                            onFocus={() =>
                                switchElementContent(
                                    '#login-time-tip div',
                                    '单位为小时，离线超出此时长后自动注销',
                                )
                            }
                            onBlur={() =>
                                switchElementContent(
                                    '#login-time-tip div',
                                    '登录保持时长 / Login retention time',
                                )
                            }
                            id='login-time'
                        />
                        <label>
                            <span className='ri-time-line'>&nbsp;</span>
                            <span id='login-time-tip'>
                                <div>登录保持时长 / Login retention time</div>
                            </span>
                        </label>
                    </div>
                    <div className='checkbox'>
                        <label className='checkbox-label'>
                            <input
                                type='checkbox'
                                className='checkbox-input'
                                id='check-keep-token-refresh'
                                defaultChecked={true}
                            />
                            <span className='checkbox-name'></span>
                            启动令牌持续刷新以保持登录
                        </label>
                    </div>
                    <div className='checkbox'>
                        <label className='checkbox-label'>
                            <input
                                type='checkbox'
                                className='checkbox-input'
                                id='remember-account'
                            />
                            <span className='checkbox-name'></span>
                            记住账号
                        </label>
                    </div>

                    <div className='form-control'>
                        <div className='big-button block' id='login-button'>
                            <span>
                                <span className='circle-loader'></span>
                            </span>
                        </div>
                        <div className='flex-items'>
                            <span>
                                没有账户？<a href='/account/signup/'>立即注册&gt;</a>
                            </span>
                            <span>
                                <a href='/about/help#forget-account'>忘记账号/密码?</a>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className='placeholder'></div>
            <div className='texts overflow'>
                <br />
                <h4>Sign In - 登录</h4>
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
