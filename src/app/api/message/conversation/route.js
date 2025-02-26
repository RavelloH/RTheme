/*
 * GET /api/message/conversation?uid=<targetUid>
 * WITH Authorization: Bearer <token>
 * RETURNS conversation with target user
 */

import prisma from '../../_utils/prisma';
import auth from '../../_utils/auth';
import limitControl from '../../_utils/limitControl';
import { decrypt } from '../../_utils/messageEncrypt';

export async function GET(request) {
    const user = await auth(request);
    if (!user) {
        return Response.json({ message: '身份认证失败' }, { status: 401 });
    }

    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }

    const url = new URL(request.url);
    const targetUid = parseInt(url.searchParams.get('uid'), 10);
    
    if (!targetUid || isNaN(targetUid)) {
        return Response.json({ message: '目标用户ID无效' }, { status: 400 });
    }

    try {
        // 查询所有与目标用户的对话消息
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { fromUserUid: user.uid, toUserUid: targetUid },
                    { fromUserUid: targetUid, toUserUid: user.uid }
                ]
            },
            orderBy: { createdAt: 'asc' },
            include: {
                from: {
                    select: {
                        uid: true,
                        username: true,
                        nickname: true,
                        avatar: true
                    }
                }
            }
        });
        
        // 解密消息内容
        const decryptedMessages = messages.map(msg => ({
            ...msg,
            content: decrypt(msg.content),
            isMine: msg.fromUserUid === user.uid
        }));

        // 获取目标用户信息
        const targetUser = await prisma.user.findUnique({
            where: { uid: targetUid },
            select: {
                uid: true,
                username: true,
                nickname: true,
                avatar: true
            }
        });

        if (!targetUser) {
            return Response.json({ message: '目标用户不存在' }, { status: 404 });
        }

        limitControl.update(request);
        return Response.json({ 
            messages: decryptedMessages,
            targetUser: targetUser
        }, { status: 200 });
    } catch (error) {
        return Response.json(
            { message: '获取对话失败', error: error.message },
            { status: 500 }
        );
    }
}
