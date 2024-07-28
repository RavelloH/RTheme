'use client';

import token from '@/utils/token';
import { useEffect } from 'react';
import switchElementContent from '@/utils/switchElement';
import objectToForm from '@/utils/objectToForm';

function main() {
    const usertoken = token.getObject();
    if (!usertoken) window.location.href = '/account/signin';
    document.querySelector('#nickname').value = usertoken.nickname;
    document.querySelector('#bio').value = usertoken.bio;
    document.querySelector('#website').value = usertoken.website;
    document.querySelector('#avatar-input').value = usertoken.avatar;
}

async function update() {
    document.querySelector('#update-button').classList.add('block');
    document.querySelector('#update-button').onclick = null;

    const nickname = document.querySelector('#nickname').value;
    const bio = document.querySelector('#bio').value;
    const website = document.querySelector('#website').value;
    let avatar = document.querySelector('#avatar-input').value;

    if (nickname.length < 1 || nickname.length > 50) {
        switchElementContent('#update-button span', '昵称长度应在1-50个字符之间');
        setTimeout(() => {
            document.querySelector('#update-button').classList.remove('block');
            document.querySelector('#update-button').onclick = () => update();
            switchElementContent('#update-button span', '提交');
        }, 5000);
        return;
    }

    if (bio.length > 255) {
        switchElementContent('#update-button span', '个人描述长度应在255个字符以内');
        setTimeout(() => {
            document.querySelector('#update-button').classList.remove('block');
            document.querySelector('#update-button').onclick = () => update();
            switchElementContent('#update-button span', '提交');
        }, 5000);
        return;
    }

    if (website.length > 60) {
        switchElementContent('#update-button span', '个人网站长度应在60个字符以内');
        setTimeout(() => {
            document.querySelector('#update-button').classList.remove('block');
            document.querySelector('#update-button').onclick = () => update();
            switchElementContent('#update-button span', '提交');
        }, 5000);
        return;
    }

    if (avatar.length > 100) {
        switchElementContent('#update-button span', '头像长度应在100个字符以内');
        setTimeout(() => {
            document.querySelector('#update-button').classList.remove('block');
            document.querySelector('#update-button').onclick = () => update();
            switchElementContent('#update-button span', '提交');
        }, 5000);
        return;
    }

    if (avatar.length > 0 && !isNaN(avatar)) {
        avatar = `https://q1.qlogo.cn/g?b=qq&nk=${avatar}&s=5`;
    }
    switchElementContent(
        '#update-button span',
        <span>
            <span className='circle-loader'></span>
        </span>,
    );

    fetch('/api/user/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer ' + token.get(),
        },
        body: objectToForm({
            nickname: nickname,
            bio: bio,
            website: website,
            avatar: avatar,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.update) {
                switchElementContent('#update-button span', '修改成功，正在刷新你的用户凭证');
                token
                    .refresh()
                    .then(() => {
                        switchElementContent('#update-button span', '修改操作已完成');
                        setTimeout(() => {
                            window.location.href = '/user?uid=' + token.read('uid');
                        }, 3000);
                    })
                    .catch((e) => {
                        switchElementContent('#update-button span', '无法自动刷新，请手动重新登陆');
                        token.clear();
                        setTimeout(() => {
                            window.location.href = '/account/signin?redirect=/user/update';
                        }, 3000);
                        console.error(e);
                    });
            } else {
                switchElementContent('#update-button span', data.message);
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

export default function User() {
    useEffect(() => {
        main();
    });

    return (
        <>
            <div className='placeholder'></div>
            <div className='texts overflow center'>
                <br />
                <br />
                <h2 className='center'>Info / 个人信息</h2> <br />
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
                                    '#update-nickname div',
                                    '长度在1-50个字符之间，仅影响名称显示',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#update-nickname div', '昵称 / Nickname')
                            }
                            id='nickname'
                        />
                        <label>
                            <span className='ri-user-6-line'>&nbsp;</span>
                            <span id='update-nickname'>
                                <div>昵称 / Nickname</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='text'
                            maxLength={255}
                            minLength={0}
                            required={true}
                            onFocus={() =>
                                switchElementContent('#update-bio div', '长度在0-255个字符之间')
                            }
                            onBlur={() => switchElementContent('#update-bio div', '个人描述 / Bio')}
                            id='bio'
                        />
                        <label>
                            <span className='ri-profile-line'>&nbsp;</span>
                            <span id='update-bio'>
                                <div>个人描述 / Bio</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='text'
                            maxLength={60}
                            minLength={0}
                            required={true}
                            onFocus={() =>
                                switchElementContent(
                                    '#update-website div',
                                    '输入你的网站首页完整地址 长度在0-60个字符之间',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#update-website div', '网站 / Website')
                            }
                            id='website'
                        />
                        <label>
                            <span className='ri-compass-3-line'>&nbsp;</span>
                            <span id='update-website'>
                                <div>网站 / Website</div>
                            </span>
                        </label>
                    </div>

                    <div className='form-control'>
                        <input
                            type='text'
                            maxLength={100}
                            minLength={0}
                            required={true}
                            onFocus={() =>
                                switchElementContent(
                                    '#update-avatar div',
                                    '输入你的头像文件地址，或者输入QQ号以使用QQ头像',
                                )
                            }
                            onBlur={() =>
                                switchElementContent('#update-avatar div', '头像 / Avatar')
                            }
                            id='avatar-input'
                        />
                        <label>
                            <span className='ri-ghost-smile-line'>&nbsp;</span>
                            <span id='update-avatar'>
                                <div>头像 / Avatar</div>
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
