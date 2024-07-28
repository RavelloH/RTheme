/*
 * POST /api/post/delete
 * WITH Authorization: Bearer <token>
 * WITH name
 * NEED role == 'ADMIN' or 'MANAGER'
 */

import prisma from '../../_utils/prisma';
import auth from '../../_utils/auth';
import qs from 'qs';
import limitControl from '../../_utils/limitControl';

export async function POST(request) {
    const time = new Date().toISOString();
    const action = await request.text();
    const { title, content, name, tag, category } = qs.parse(action);
    const ip =
        request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.ip || '';
    const user = await auth(request);
    if (!user)
        return Response.json(
            {
                message: '身份认证失败',
            },
            { status: 401 },
        );

    if (!name) {
        return Response.json(
            {
                message: '参数不完整',
            },
            { status: 400 },
        );
    }

    if (!/^[a-z0-9-]+$/.test(name)) {
        return Response.json(
            {
                message: 'name格式不正确',
            },
            { status: 400 },
        );
    }

    if (!user.role.includes('ADMIN') && !user.role.includes('MANAGER')) {
        return Response.json(
            {
                message: '权限不足',
            },
            { status: 403 },
        );
    }

    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }

    try {
        await prisma.post.delete({
            where: { name: name },
        });
    } catch (error) {
        return Response.json(
            {
                message: '删除失败',
                error: error,
            },
            { status: 500 },
        );
    }

    // 垃圾清理
    await prisma.tag.deleteMany({
        where: { post: { none: {} } },
    });

    await prisma.category.deleteMany({
        where: { post: { none: {} } },
    });

    limitControl.update(request);
    return Response.json({ message: '删除成功' }, { status: 200 });
}
