/*
 * POST /api/comment/delete
 * WITH Authorization: Bearer <token>
 * WITH BODY: {id}
 * RETURN {message}
 */

import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import token from '../../_utils/token';
import qs from 'qs';

const editableProperty = ['id'];

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

        if (typeof info == 'undefined' || info == '' || info == null) {
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

        console.log(info);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return Response.json({ message: '缺少授权头信息' }, { status: 400 });
        }

        // 验证格式

        if (!(await limitControl.check(request))) {
            return Response.json({ message: '已触发速率限制' }, { status: 429 });
        }
        // 检查传入的token
        const tokenString = authHeader.split(' ')[1];
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
            let filteredObject = filterObject(editableProperty, JSON.parse(JSON.stringify(info)));

            // 检查是否存在两个及以上的'postUid', 'noteUid', 'commentUid'
            const count = ['postUid', 'noteUid', 'commentUid'].filter(
                (key) => filteredObject[key],
            ).length;
            if (count > 1) {
                return Response.json({ message: '请提供唯一的参数' }, { status: 400 });
            }
            // 请求新信息
            console.log(filteredObject);
            try {
                if (filteredObject.id) {
                    // 有id: 查找并验证user
                    const comment = await prisma.comment.findUnique({
                        where: {
                            id: filteredObject.id,
                        },
                    });
                    if (!comment) {
                        return Response.json({ message: '评论不存在' }, { status: 404 });
                    }

                    if (comment.userUid !== tokenInfo.uid) {
                        return Response.json({ message: '无权操作此评论' }, { status: 403 });
                    }
                    // delete

                    await prisma.comment.delete({
                        where: {
                            id: filteredObject.id,
                        },
                    });
                } else {
                    // 无id: 返回错误
                    return Response.json({ message: '请提供id' }, { status: 400 });
                }
                limitControl.update(request);
                return Response.json(
                    { message: '删除成功', update: filteredObject },
                    { status: 200 },
                );
            } catch (e) {
                return Response.json({ message: '评论操作失败', error: e }, { status: 429 });
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
