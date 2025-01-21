import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import auth from '../../_utils/auth';

export async function GET(request) {
    // 限制请求频率
    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }
    limitControl.update(request);
    // 检查登录状态
    const user = await auth(request);
    if (!user)
        return Response.json(
            {
                message: '身份认证失败',
            },
            { status: 401 },
        );
    try {
        const { searchParams } = new URL(request.url);
        const latestParam = searchParams.get('latest') || 0;
        let latestTime = new Date(0);

        if (!isNaN(Date.parse(latestParam))) {
            latestTime = new Date(latestParam);
        }

        // 获取新通知
        const notices = await prisma.notice.findMany({
            where: {
                createdAt: {
                    gt: latestTime,
                },
                userUid: user.uid,
            },
            orderBy: {
                createdAt: 'desc', // 将 'asc' 改为 'desc' 以降序排列
            },
        });

        // 若请求到新数据，则设置 newestTime = 最后一条通知的 createdAt
        let newestTime = latestTime;
        if (notices.length > 0) {
            newestTime = notices[notices.length - 1].createdAt;
        }

        return Response.json({
            notices,
            latest: newestTime,
        });
    } catch (err) {
        return Response.json({ message: '通知读取失败', error: err.message }, { status: 500 });
    }
}
