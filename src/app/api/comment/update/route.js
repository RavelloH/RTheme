/*
 * POST /api/comment/update
 * WITH Authorization: Bearer <token>
 * WITH BODY: {id,content,postUid,noteUid,commentUid}
 * RETURN {message}
 */

import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import token from '../../_utils/token';
import qs from 'qs';
import sendNotice from '../../_utils/notice';

const editableProperty = ['id', 'content', 'postUid', 'noteUid', 'commentUid'];

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
            if (filteredObject.content.replaceAll(' ', '') < 1) {
                return Response.json({ message: '评论不能为空' }, { status: 400 });
            }
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
                    try {
                        await prisma.comment.update({
                            where: {
                                id: filteredObject.id,
                            },
                            data: {
                                content: filteredObject.content,
                            },
                        });
                    } catch (error) {
                        return Response.json(
                            { message: '更新评论失败', error: error.message },
                            { status: 500 },
                        );
                    }
                } else {
                    // 无id: 创建流程
                    try {
                        await prisma.comment.create({
                            data: {
                                content: filteredObject.content,
                                userUid: tokenInfo.uid,
                                postUid: filteredObject.postUid,
                                noteUid: filteredObject.noteUid,
                                commentUid: filteredObject.commentUid,
                            },
                        });
                        // 如果是回复评论，发送notice
                        if (filteredObject.commentUid) {
                            const comment = await prisma.comment.findUnique({
                                where: {
                                    id: filteredObject.commentUid,
                                },
                                include: {
                                    post: {
                                        select: {
                                            name: true,
                                        },
                                    },
                                },
                            });
                            if (comment) {
                                await sendNotice(
                                    `您的评论"${comment.content}"被${tokenInfo.nickname}回复了：${filteredObject.content}`,
                                    `/posts/${comment.post.name}#${filteredObject.commentUid}`,
                                    comment.userUid,
                                );
                            }
                        }
                        // 如果是回复post，发送notice
                        if (filteredObject.postUid) {
                            const post = await prisma.post.findUnique({
                                where: {
                                    id: filteredObject.postUid,
                                },
                            });
                            if (post) {
                                await sendNotice(
                                    `您的文章"${post.title}"被${tokenInfo.nickname}评论了：${filteredObject.content}`,
                                    `/posts/${post.name}`,
                                    post.userUid,
                                );
                            }
                        }
                    } catch (error) {
                        return Response.json(
                            { message: '创建评论失败', error: error.message },
                            { status: 500 },
                        );
                    }
                }
                limitControl.update(request);
                return Response.json({ message: '操作成功' }, { status: 200 });
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
