/*
 * POST /api/post/create
 * WITH Authorization: Bearer <token>
 * WITH title, content, name, tag, category
 */

import prisma from '../../_utils/prisma';
import auth from '../../_utils/auth';
import qs from 'qs';

function convertToObjectArray(input) {
    const arr = input.split(' ');
    const result = arr.map((item) => {
        return { where: { name: item }, create: { name: item } };
    });
    return result;
}

export async function POST(request) {
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

    return Response.json({ message: '创建成功' }, { status: 200 });
}
