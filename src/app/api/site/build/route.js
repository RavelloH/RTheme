/*
 * POST /api/site/build
 * WITH Authorization: Bearer <token>
 */

import prisma from '../../_utils/prisma';
import limitControl from '../../_utils/limitControl';
import token from '../../_utils/token';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return Response.json({ message: '缺少授权头信息' }, { status: 400 });
        }

        // 验证格式
        if (!(await limitControl.check(request))) {
            return Response.json({ message: '已触发速率限制' }, { status: 429 });
        }
        // 检查传入的token
        const tokenString = authHeader.split(' ')[1];
        let tokenInfo;
        try {
            tokenInfo = token.verify(tokenString);
        } catch (err) {
            if (err.name == 'TokenExpiredError') {
                return Response.json(
                    {
                        message: 'TOKEN已过期，请重新登录',
                    },
                    { status: 410 },
                );
            } else {
                return Response.json(
                    {
                        message: 'TOKEN无效',
                        error: err,
                    },
                    { status: 400 },
                );
            }
        }

        // 检查用户权限
        if (tokenInfo) {
            if (tokenInfo.role == "ADMIN") {
                // TODO: 根据config中设置的平台触发相关Hook

                return Response.json({ message: '成功(这是一条占位消息)' }, { status: 200 });
            }
            return Response.json({ message: '权限不足' }, { status: 400 });
        }
        return Response.json({ message: '请提供TOKEN' }, { status: 400 });
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
