import response from "@/app/api/_utils/response"
import { RegisterUserSchema } from "@repo/shared-types/api/auth"


/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 注册新用户
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUser'
 *     responses:
 *       200:
 *         description: 注册成功 
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       409:
 *         description: 用户名或邮箱已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // 验证请求数据
        const validationResult = RegisterUserSchema.safeParse(body);
        
        if (!validationResult.success) {
            const errors = validationResult.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            
            return response.badRequest("数据验证失败", {
                code: 'VALIDATION_ERROR',
                message: '请求数据格式不正确',
                details: { errors }
            });
        }
        
        const { username, email, password, nickname } = validationResult.data;
        
        // TODO: 检查用户名是否已存在
        // TODO: 检查邮箱是否已存在
        // TODO: 创建用户账户
        // TODO: 发送验证邮件
        
        return response.created({
            message: "注册成功，请查收验证邮件"
        }, "用户注册成功");
        
    } catch (error) {
        console.error('Registration error:', error);
        return response.serverError("注册失败，请稍后重试");
    }
}