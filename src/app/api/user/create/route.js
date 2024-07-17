/*
 * POST /api/user/create
 * WITH username, nickname, email, password
 */

import prisma from '../../_utils/prisma';
import * as argon2 from 'argon2';
import shuffler from '../../_utils/shuffler';
import limitControl from '../../_utils/limitControl';
import qs from 'qs';

// 注册器
async function signup(username, nickname, email, password) {
    let encryptPassword = await encrypt(password);
    await prisma.user.create({
        data: {
            username: username,
            nickname: nickname,
            email: email,
            password: encryptPassword,
        },
    });
}

// 加密器
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

function check(requestAction) {
    if (
        !requestAction.username ||
        !requestAction.email ||
        !requestAction.nickname ||
        !requestAction.password
    ) {
        return '缺少必须的参数';
    }

    // 验证密码格式
    if (requestAction.password.length < 6) {
        return '密码位数不正确，最少6位';
    }

    // 验证长度
    if (requestAction.username.length > 10 || requestAction.nickname > 50) {
        return '用户名/昵称长度超过限制';
    }

    // 检查邮箱
    if (!/\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}/.test(requestAction.email)) {
        return '邮箱格式错误';
    }

    // 检查用户名
    if (!/^[a-z0-9_]+$/.test(requestAction.username)) {
        return '用户名中包含非法字符';
    }

    if (requestAction.username.length > 10 || requestAction.username.length < 5) {
        return '用户名长度应在5-10位之间';
    }

    return;
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
            return;
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

        let checkResult = check(info);

        // 验证格式
        if (checkResult) {
            return Response.json({ message: checkResult }, { status: 400 });
        }

        let requestAction = info;

        if (!(await limitControl.check(request))) {
            return Response.json({ message: '已触发速率限制' }, { status: 429 });
        }
        let result = await prisma.user.findMany({
            where: {
                OR: [
                    {
                        email: requestAction.email,
                    },
                    {
                        username: requestAction.username,
                    },
                ],
            },
        });

        if (result.length !== 0) {
            return Response.json({ message: '用户名/邮箱已被占用' }, { status: 400 });
        } else {
            // 注册流程
            try {
                await signup(
                    requestAction.username,
                    requestAction.nickname,
                    requestAction.email,
                    requestAction.password,
                );
                limitControl.update(request);
                return Response.json({ message: '注册成功' }, { status: 200 });
            } catch (e) {
                return Response.json({ message: '注册失败' + e }, { status: 400 });
            }
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
