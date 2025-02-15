/*
 * POST /api/post/create
 * WITH Authorization: Bearer <token>
 * WITH title, content, name, tag, category, draft?
 * NEED role == 'ADMIN' or 'MANAGER'
 */

import prisma from '../../_utils/prisma';
import auth from '../../_utils/auth';
import qs from 'qs';
import limitControl from '../../_utils/limitControl';
import { refreshPosts } from '../../_utils/refresh';

function convertToObjectArray(input) {
    const arr = input.split(' ');
    const result = arr.map((item) => {
        return { where: { name: item }, create: { name: item } };
    });
    return result;
}

export async function POST(request) {
    const action = await request.text();
    const { title, content, name, tag, category, draft } = qs.parse(action);
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

    if (!title || !content || !name || !tag || !category) {
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
        const post = await prisma.post.create({
            data: {
                title: title,
                content: content,
                name: name,
                tag: {
                    connectOrCreate: convertToObjectArray(tag),
                },
                category: {
                    connectOrCreate: convertToObjectArray(category),
                },
                ip: ip,
                userUid: user.uid,
                published: draft == 'true' ? false : true,
            },
        });
    } catch (error) {
        return Response.json(
            {
                message: '创建失败',
                error: error,
            },
            { status: 500 },
        );
    }

    limitControl.update(request);
    refreshPosts();
    return Response.json({ message: '创建成功' }, { status: 200 });
}
