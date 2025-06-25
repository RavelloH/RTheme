/*
 * GET /api/search/post
 * WITH PARAM q
 * RETURN {name,title,createdAt,likes,tag,category,content}
 */

import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';

function searchAndExtract(str, query) {
    var start = str.toLowerCase().indexOf(query.toLowerCase());
    if (start !== -1) {
        start = Math.max(start - 15, 0);
        var end = start + 100;
        if (end > str.length) {
            end = str.length;
        }
        return str.substring(start, end);
    }
    return null;
}

export async function GET(request) {
    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }
    let q = new URL(request.url).searchParams.get('q');

    if (q == '' || q == null) {
        return Response.json({ message: 'Server is running' }, { status: 200 });
    }
    if (q.length < 2) {
        return Response.json({ message: '请至少输入两个字符' }, { status: 400 });
    }

    const posts = await prisma.post.findMany({
        where: {
            content: {
                contains: q,
                mode: 'insensitive',
            },
        },
        orderBy: {
            _relevance: {
                fields: ['title', 'content'],
                search: q,
                sort: 'desc',
            },
        },
        include: {
            category: true,
            tag: true,
            ip: false,
            updatedAt: false,
        },
    });
    let result = [];

    posts.forEach((post) => {
        if (!post.published) {
            return;
        }
        result.push({
            name: post.name,
            title: post.title,
            createdAt: post.createdAt,
            likes: post.likeUserUid.length,
            tag: post.tag,
            category: post.category,
            content: '...' + searchAndExtract(post.content, q) + '...',
        });
    });

    limitControl.update(request);
    return Response.json(result, { status: 200 });
}
