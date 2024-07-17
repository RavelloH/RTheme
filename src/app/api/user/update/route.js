/*
 * POST /api/user/update
 * WITH Authorization: Bearer <token>
 */

import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import token from '../../_utils/token';
import qs from 'qs';

const editableProperty = ['nickname', 'bio', 'birth', 'country', 'website', 'avatar', 'gender'];

function filterObject(properties, objects) {
    const filteredObject = {};
    if (typeof objects === 'object' && objects !== null) {
        for (let property in objects) {
            if (objects.hasOwnProperty(property) && properties.includes(property)) {
                filteredObject[property] = objects[property];
            }
        }
    }
    return filteredObject;
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

        if (typeof request.headers.get('authorization') == 'undefined') {
            return Response.json(
                { message: '请提供验证信息' },
                {
                    status: 401,
                },
            );
        }

        // 验证格式

        if (await limitControl.check(request)) {
            // 检查传入的token
            const tokenString = request.headers.get('authorization').split(' ')[1];
            let tokenInfo;
            try {
                tokenInfo = token.verify(tokenString);
            } catch (err) {
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
                            error: err,
                        },
                        { status: 400 },
                    );
                }
            }

            // 更新信息
            if (tokenInfo) {
                let filteredObject = filterObject(
                    editableProperty,
                    JSON.parse(JSON.stringify(info)),
                );
                // 请求新信息
                try {
                    await prisma.user.update({
                        where: { uid: tokenInfo.uid },
                        data: filteredObject,
                    });
                    limitControl.update(request);
                    return Response.json(
                        { message: '修改成功', update: filteredObject },
                        { status: 200 },
                    );
                } catch (e) {
                    return Response.json(
                        { message: '修改失败：一项或多项属性值不合法', error: e },
                        { status: 429 },
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
