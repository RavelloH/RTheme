import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import auth from '../../_utils/auth';

export async function POST(request) {
    if (!(await limitControl.check(request))) {
        return new Response(JSON.stringify({ message: '已触发速率限制' }), { status: 429 });
    }
    limitControl.update(request);

    const user = await auth(request);
    if (!user) {
        return new Response(JSON.stringify({ message: '身份认证失败' }), { status: 401 });
    }

    try {
        const ids = await request.json();
        await prisma.notice.updateMany({
            where: {
                userUid: user.uid,
                id: { in: ids },
            },
            data: {
                isRead: true
            }
        });
        return new Response(JSON.stringify({ success: true }));
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
