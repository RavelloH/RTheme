/*
 * POST /api/user/authorize
 * WITH ( account password ) || token
 */

import prisma from '../../_utils/prisma';
import * as argon2 from 'argon2';
import shuffler from '../../_utils/shuffler';
import limitControl from '../../_utils/limitControl';
import token from '../../_utils/token';
import qs from 'qs';
import pack from '../../_utils/pack';

let startTime;
let isPasswordOK;
let shufflerPassword;
let infoJSON;

async function updateTime(uid, time) {
    await prisma.user.update({
        where: {
            uid: uid,
        },
        data: {
            lastUseAt: time + '',
        },
    });
}

export async function POST(request) {
    startTime = Date.now();
    try {
        let info = await request.text();

        if (typeof info == 'undefined') {
            return Response.json(
                {
                    message: '请传入必需的参数',
                },
                { status: 400 },
            );
        }
        if (typeof info == 'string') {
            try {
                info = qs.parse(info);
            } catch (e) {
                return Response.json(
                    { message: '无法解析此请求', error: e },
                    {
                        status: 400,
                    },
                );
            }
        }

        let infoJSON = info;

        if (await limitControl.check(request)) {
            // 登录模式分发
            if (typeof infoJSON.token !== 'undefined') {
                // JWT 刷新登录

                // 检查传入的token
                let tokenInfo;
                try {
                    tokenInfo = token.verify(infoJSON.token);
                } catch (err) {
                    let tokenInfo;
                    if (err.name == 'TokenExpiredError') {
                        return Response.json(
                            {
                                message: 'TOKEN已过期，请重新登录',
                            },
                            { status: 410 },
                        );
                    } else {
                        return Response.json(
                            {
                                message: 'TOKEN无效',
                            },
                            { status: 400 },
                        );
                    }
                }

                // TOKEN有效，刷新TOKEN
                if (tokenInfo) {
                    // 请求新信息
                    let result = await prisma.user.findUnique({ where: { uid: tokenInfo.uid } });
                    // 检查此Token是否为最新
                    if (result.lastUseAt == tokenInfo.lastUseAt + '') {
                        updateTime(result.uid, startTime);
                        return Response.json(
                            {
                                message: '登录成功',
                                info: pack(result, startTime),
                                token: token.sign(
                                    pack(result, startTime),
                                    infoJSON.expiredTime || '7d',
                                ),
                            },
                            { status: 200 },
                        );
                    } else {
                        return Response.json(
                            {
                                message: 'TOKEN未处于激活状态',
                            },
                            { status: 420 },
                        );
                    }
                }
            } else if (
                typeof infoJSON.account !== 'undefined' &&
                typeof infoJSON.password !== 'undefined'
            ) {
                // 密码登录

                // 验证密码长度
                if (infoJSON.password.length < 6) {
                    return Response.json(
                        {
                            message: '密码格式错误',
                        },
                        { status: 400 },
                    );
                }

                // 查询是否有此用户
                let result = await prisma.user.findFirst({
                    where: {
                        OR: [
                            {
                                email: infoJSON.account,
                            },
                            {
                                username: infoJSON.account,
                            },
                        ],
                    },
                });

                if (result == null) {
                    return Response.json(
                        {
                            message: '未找到此账号，请先注册',
                        },
                        { status: 400 },
                    );
                } else {
                    // 验证密码
                    shufflerPassword = shuffler(infoJSON.password);
                    console.log(shufflerPassword);
                    let passwordValidate = await argon2.verify(result.password, shufflerPassword);
                    isPasswordOK = passwordValidate;
                    if (isPasswordOK) {
                        await updateTime(result.uid, startTime);
                        limitControl.update(request);
                        return Response.json(
                            {
                                message: '登录成功',
                                info: pack(result, startTime),
                                token: token.sign(
                                    pack(result, startTime),
                                    infoJSON.expiredTime || '7d',
                                ),
                            },
                            { status: 200 },
                        );
                    } else {
                        return Response.json(
                            {
                                message: '密码错误',
                            },
                            { status: 400 },
                        );
                    }
                }
            } else {
                return Response.json(
                    {
                        message: '缺少必要的参数',
                    },
                    { status: 400 },
                );
            }
        } else {
            return Response.json({ message: '已触发速率限制' }, { status: 429 });
        }
    } catch (error) {
        console.error(error);
        return Response.json(
            {
                code: 500,
                message: '500 Interal server error.',
                error: error,
            },
            { status: 500 },
        );
    }
}
