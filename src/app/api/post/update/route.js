/*
 * POST /api/post/update
 * WITH name, title, content, tag, category
 */

import prisma from '../../_utils/prisma';
import auth from '../../_utils/auth';
import qs from 'qs';
import limitControl from '../../_utils/limitControl';

function convertToObjectArray(input) {
    if (!input) return [];
    const arr = input.split(' ');
    const result = arr.map((item) => {
        return { where: { name: item }, create: { name: item } };
    });
    return result;
}

function convertToObjectArrayClean(input) {
    if (!input) return [];
    const arr = input.split(' ');
    const result = arr.map((item) => {
        return { name: item };
    });
    return result;
}

function findUniqueObjects(arr1, arr2) {
    return arr1.filter((obj1) => {
        return !arr2.some((obj2) => {
            return obj1.name === obj2.name;
        });
    });
}

const editableProperty = ['name', 'title', 'content', 'draft', 'tag', 'category'];

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
    const time = new Date().toISOString();
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

    if (!name || !title || !content || !tag || !category) {
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
    let filteredObject = filterObject(editableProperty, qs.parse(action));
    filteredObject.updatedAt = time;
    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }
    try {
        const oldPost = await prisma.post.findUnique({
            where: { name: name },
            include: { tag: true, category: true, content: false },
        });
        await prisma.post.update({
            where: { name: name },
            data: {
                title: filteredObject.title || undefined,
                content: filteredObject.content || undefined,
                tag: {
                    disconnect: findUniqueObjects(oldPost.tag, convertToObjectArrayClean(tag)),
                    connectOrCreate: convertToObjectArray(tag) || undefined,
                },
                category: {
                    disconnect: findUniqueObjects(
                        oldPost.category,
                        convertToObjectArrayClean(category),
                    ),
                    connectOrCreate: convertToObjectArray(category) || undefined,
                },
                updatedAt: time,
                published: !draft || true,
            },
        });
    } catch (error) {
        return Response.json(
            {
                message: '修改失败',
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
    return Response.json({ message: '修改成功', update: filteredObject }, { status: 200 });
}
