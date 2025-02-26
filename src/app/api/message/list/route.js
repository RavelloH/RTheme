/*
 * GET /api/message/list
 * WITH Authorization: Bearer <token>
 * RETURNS list of users who have conversation with current user
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

    try {
        // 查找当前用户发送或接收的所有消息
        const sentMessages = await prisma.message.findMany({
            where: { fromUserUid: user.uid },
            include: {
                to: {
                    select: {
                        uid: true,
                        username: true,
                        nickname: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const receivedMessages = await prisma.message.findMany({
            where: { toUserUid: user.uid },
            include: {
                from: {
                    select: {
                        uid: true,
                        username: true,
                        nickname: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // 整合发送和接收消息的用户列表（排除重复）
        const userMap = new Map();

        sentMessages.forEach((msg) => {
            if (!userMap.has(msg.toUserUid)) {
                userMap.set(msg.toUserUid, {
                    uid: msg.to.uid,
                    username: msg.to.username,
                    nickname: msg.to.nickname,
                    avatar: msg.to.avatar,
                    lastMessageTime: msg.createdAt,
                });
            } else if (msg.createdAt > userMap.get(msg.toUserUid).lastMessageTime) {
                userMap.get(msg.toUserUid).lastMessageTime = msg.createdAt;
            }
        });

        receivedMessages.forEach((msg) => {
            if (!userMap.has(msg.fromUserUid)) {
                userMap.set(msg.fromUserUid, {
                    uid: msg.from.uid,
                    username: msg.from.username,
                    nickname: msg.from.nickname,
                    avatar: msg.from.avatar,
                    lastMessageTime: msg.createdAt,
                });
            } else if (msg.createdAt > userMap.get(msg.fromUserUid).lastMessageTime) {
                userMap.get(msg.fromUserUid).lastMessageTime = msg.createdAt;
            }
        });

        // 转换为数组并按最后消息时间排序
        const userList = Array.from(userMap.values()).sort(
            (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime),
        );

        limitControl.update(request);
        return Response.json({ users: userList }, { status: 200 });
    } catch (error) {
        return Response.json(
            { message: '获取用户列表失败', error: error.message },
            { status: 500 },
        );
    }
}
