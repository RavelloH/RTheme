/*
 * GET /api/user/search?query=<query>
 * WITH Authorization: Bearer <token>
 * RETURNS list of users matching query
 */

import prisma from '../../_utils/prisma';
import auth from '../../_utils/auth';
import limitControl from '../../_utils/limitControl';

export async function GET(request) {
    const user = await auth(request);
    if (!user) {
        return Response.json({ message: '身份认证失败' }, { status: 401 });
    }

    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    if (!query || query.trim().length === 0) {
        return Response.json({ users: [] }, { status: 200 });
    }

    try {
        // 尝试解析查询为UID
        const uid = parseInt(query, 10);
        let users = [];

        // 如果是有效UID，直接按UID搜索
        if (!isNaN(uid)) {
            const userByUid = await prisma.user.findUnique({
                where: { uid },
                select: {
                    uid: true,
                    username: true,
                    nickname: true,
                    avatar: true,
                },
            });

            if (userByUid) {
                users = [userByUid];
            }
        }

        // 如果没有匹配的UID或不是数字，按用户名和昵称搜索
        if (users.length === 0) {
            users = await prisma.user.findMany({
                where: {
                    OR: [
                        { username: { contains: query, mode: 'insensitive' } },
                        { nickname: { contains: query, mode: 'insensitive' } },
                    ],
                    // 排除当前用户
                    NOT: { uid: user.uid },
                },
                select: {
                    uid: true,
                    username: true,
                    nickname: true,
                    avatar: true,
                },
                take: 10, // 限制返回结果数量
            });
        }

        limitControl.update(request);
        return Response.json({ users }, { status: 200 });
    } catch (error) {
        return Response.json({ message: '搜索用户失败', error: error.message }, { status: 500 });
    }
}
