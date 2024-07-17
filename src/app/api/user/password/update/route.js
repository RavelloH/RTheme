/*
 * POST /api/user/password/update
 * WITH account, password, newpassword
 */

import prisma from '../../../_utils/prisma';
import * as argon2 from 'argon2';
import shuffler from '../../../_utils/shuffler';
import limitControl from '../../../_utils/limitControl';
import qs from 'qs';

async function encrypt(password) {
    const pwd = shuffler(password);
    const options = {
        timeCost: 3,
        memoryCost: 65536,
        parallelism: 8,
        hashLength: 32,
    };
    const hashedPassword = await argon2.hash(shuffler(password), options);
    return hashedPassword;
}

export async function POST(request) {
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
        if (!info.account || !info.password || !info.newpassword) {
            return Response.json(
                {
                    message: '请传入必需的参数',
                },
                { status: 400 },
            );
        }

        if (info.password.length < 6 || info.newpassword.length < 6) {
            return Response.json(
                {
                    message: '密码长度不能小于6位',
                },
                { status: 400 },
            );
        }

        let infoJSON = info;

        if (await limitControl.check(request)) {
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
                        message: '未找到此账户',
                    },
                    { status: 400 },
                );
            } else {
                // 验证密码
                let shufflerPassword = shuffler(infoJSON.password);
                let passwordValidate = await argon2.verify(result.password, shufflerPassword);
                let isPasswordOK = passwordValidate;
                if (isPasswordOK) {
                    // 修改密码
                    let encryptPassword = await encrypt(info.newpassword);
                    try {
                        await prisma.user.update({
                            where: {
                                uid: result.uid,
                            },
                            data: {
                                password: encryptPassword,
                            },
                        });
                        limitControl.update(request);
                        return Response.json(
                            {
                                message: '修改成功',
                            },
                            { status: 200 },
                        );
                    } catch (e) {
                        return Response.json(
                            {
                                message: '写入密码时发生错误',
                            },
                            { status: 400 },
                        );
                    }
                } else {
                    return Response.json(
                        {
                            message: '密码错误',
                        },
                        { status: 401 },
                    );
                }
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
