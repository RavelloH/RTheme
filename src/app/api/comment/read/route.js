/*
 * GET /api/comment/read
 * WITH PARAM postUid/noteUid/commentUid
 * RETURN Array[{id,content,createdAt,updatedAt,likeUserUid,user}]
 */
const md = require('markdown-it')();
import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';

export async function GET(request) {
    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }

    const postUid = new URL(request.url).searchParams.get('postUid');
    const noteUid = new URL(request.url).searchParams.get('noteUid');
    const commentUid = new URL(request.url).searchParams.get('commentUid');

    if (postUid == null && noteUid == null && commentUid == null) {
        return Response.json({ message: '请提供参数' }, { status: 400 });
    }

    let result = [];

    const fetchComments = async (uid, type) => {
        try {
            const comments = await prisma.comment.findMany({
                where: {
                    [type]: uid,
                },
                include: {
                    replies: true,
                    user: {
                        select: {
                            uid: true,
                            username: true,
                            nickname: true,
                            avatar: true,
                        },
                    },
                },
            });
            result = result.concat(comments);
        } catch (error) {
            console.error(`Error fetching comments for ${type}:`, error);
        }
    };

    if (postUid != null) await fetchComments(postUid, 'postUid');
    if (noteUid != null) await fetchComments(noteUid, 'noteUid');
    if (commentUid != null) await fetchComments(commentUid, 'commentUid');

    limitControl.update(request);
    // markdown渲染
    for (const comment of result) {
        comment.content = md.render(comment.content);
        for (const reply of comment.replies) {
            reply.content = md.render(reply.content);
        }
    }
    return Response.json(result, { status: 200 });
}
