/*
 * POST /api/comment/like
 * WITH Authorization: Bearer <token>
 * WITH BODY: {commentUid}
 * RETURN {message}
 */

import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import token from '../../_utils/token';
import qs from 'qs';

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

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return Response.json({ message: '缺少授权头信息' }, { status: 400 });
        }

        if (!(await limitControl.check(request))) {
            return Response.json({ message: '已触发速率限制' }, { status: 429 });
        }

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

        if (tokenInfo) {
            const { commentId } = info;
            if (!commentId) {
                return Response.json({ message: '请提供评论ID' }, { status: 400 });
            }

            try {
                const comment = await prisma.comment.findUnique({
                    where: {
                        id: commentId,
                    },
                });

                if (!comment) {
                    return Response.json({ message: '评论不存在' }, { status: 404 });
                }

                let likeUserUid = comment.likeUserUid || [];
                const userIndex = likeUserUid.indexOf(tokenInfo.uid);

                if (userIndex > -1) {
                    likeUserUid.splice(userIndex, 1);
                } else {
                    likeUserUid.push(tokenInfo.uid);
                }

                await prisma.comment.update({
                    where: {
                        id: commentId,
                    },
                    data: {
                        likeUserUid: likeUserUid,
                    },
                });

                limitControl.update(request);
                return Response.json(
                    { message: '操作成功', likeUserUid: likeUserUid },
                    { status: 200 },
                );
            } catch (error) {
                return Response.json(
                    { message: '点赞操作失败', error: error.message },
                    { status: 500 },
                );
            }
        }
    } catch (error) {
        console.error(error);
        return Response.json(
            {
                code: 500,
                message: '500 Internal server error.',
                error: error,
            },
            { status: 500 },
        );
    }
}
