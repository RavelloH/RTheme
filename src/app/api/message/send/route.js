/*
 * POST /api/message/send
 * WITH Authorization: Bearer <token>
 * WITH targetUid, content
 * RETURNS success message
 */

import prisma from '../../_utils/prisma';
import auth from '../../_utils/auth';
import qs from 'qs';
import limitControl from '../../_utils/limitControl';
import { encrypt } from '../../_utils/messageEncrypt';
import sendNotice from '../../_utils/notice';

// 定义消息最大字数
const MAX_MESSAGE_LENGTH = 300;

export async function POST(request) {
    const action = await request.text();
    const { targetUid, content } = qs.parse(action);

    const user = await auth(request);
    if (!user) {
        return Response.json({ message: '身份认证失败' }, { status: 401 });
    }

    if (!targetUid || !content) {
        return Response.json({ message: '参数不完整' }, { status: 400 });
    }

    // 验证消息字数是否超出限制
    if (content.length > MAX_MESSAGE_LENGTH) {
        return Response.json(
            {
                message: `消息长度超出限制，最大${MAX_MESSAGE_LENGTH}字符`,
                currentLength: content.length,
                maxLength: MAX_MESSAGE_LENGTH,
            },
            { status: 400 },
        );
    }

    const parsedTargetUid = parseInt(targetUid, 10);
    if (isNaN(parsedTargetUid)) {
        return Response.json({ message: '目标用户ID无效' }, { status: 400 });
    }

    if (parsedTargetUid === user.uid) {
        return Response.json({ message: '不能给自己发送消息' }, { status: 400 });
    }

    if (!(await limitControl.check(request))) {
        return Response.json({ message: '已触发速率限制' }, { status: 429 });
    }

    try {
        // 确认目标用户存在
        const targetUser = await prisma.user.findUnique({
            where: { uid: parsedTargetUid },
        });

        const sendUser = await prisma.user.findUnique({
            where: { uid: user.uid },
        });

        if (!targetUser) {
            return Response.json({ message: '目标用户不存在' }, { status: 404 });
        }

        // 加密消息内容
        const encryptedContent = encrypt(content);

        // 创建消息记录
        const message = await prisma.message.create({
            data: {
                content: encryptedContent,
                fromUserUid: user.uid,
                toUserUid: parsedTargetUid,
            },
        });

        limitControl.update(request);
        await sendNotice(
            `来自${sendUser.nickname}的私信:${content.slice(0, 10)}...`,
            `/message?uid=${message.fromUserUid}`,
            parsedTargetUid,
        );

        return Response.json(
            {
                message: '发送成功',
                messageId: message.id,
            },
            { status: 200 },
        );
    } catch (error) {
        return Response.json({ message: '发送失败', error: error.message }, { status: 500 });
    }
}
