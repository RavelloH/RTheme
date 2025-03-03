/*
 * POST /api/user/follow
 * WITH account, password, newpassword
 */

import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import auth from '../../_utils/auth';
import qs from 'qs';

export async function POST(request) {
    try {
        let info = await request.text();

        if (typeof info == 'undefined') {
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
        if (!info.action || !info.uid) {
            return Response.json(
                {
                    message: '请传入必需的参数',
                },
                { status: 400 },
            );
        }



        let infoJSON = info;

        if (!(await limitControl.check(request))) {
            return Response.json({ message: '已触发速率限制' }, { status: 429 });
        }
        const user = auth(request);
        if (!user) {
            return Response.json({ message: '身份认证失败' }, { status: 401 });
        }
        let result = await prisma.user.findUnique({
            where: {
                uid: Number(infoJSON.uid),
            },
        });

        if (result == null) {
            return Response.json(
            {
                message: '未找到此账户',
            },
            { status: 400 },
            );
        } else {
            if (infoJSON.action == 'follow') {
            try {
                await prisma.friendShip.create({
                data: {
                    id: user.uid + '-' + infoJSON.uid,
                    followingUserUid: Number(user.uid),
                    followedUserUid: Number(infoJSON.uid),
                },
                });
                return Response.json(
                {
                    message: '关注成功',
                },
                { status: 200 },
                );
            } catch (e) {
                if (e.code === 'P2002') {
                return Response.json(
                    {
                    message: '您已经关注了该用户',
                    },
                    { status: 400 },
                );
                } 
                throw e;
            }
            }
            if (infoJSON.action == 'unfollow') {
            const friendship = await prisma.friendShip.findUnique({
                where: {
                id: user.uid + '-' + infoJSON.uid,
                },
            });
            
            if (!friendship) {
                return Response.json(
                {
                    message: '您尚未关注该用户',
                },
                { status: 400 },
                );
            }
            
            await prisma.friendShip.deleteMany({
                where: {
                id: user.uid + '-' + infoJSON.uid,
                },
            });
            return Response.json(
                {
                message: '取消关注成功',
                },
                { status: 200 },
            );
            }
        }
    } catch (error) {
        console.error(error);
        return Response.json(
            {
                code: 500,
                message: '500 Interal server error.',
                error: error,
            },
            { status: 500 },
        );
    }
}
