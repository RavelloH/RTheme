"use server";

import type { NextResponse } from "next/server";
import { headers } from "next/headers";
import * as Ably from "ably";
import type { TokenRequest } from "ably";
import { authVerify } from "@/lib/server/auth-verify";
import { getAblyApiKey } from "@/lib/server/ably-config";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rate-limit";
import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";

type AblyActionEnvironment = "serverless" | "serveraction";
type AblyActionConfig = { environment?: AblyActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/**
 * Ably Token Request 响应数据类型
 */
export interface AblyTokenRequestData {
  tokenRequest: TokenRequest;
  userUid: number;
}

/**
 * 获取 Ably Token Request（用于客户端连接）
 *
 * 此函数通过 Server Action 调用，自动携带 HTTP-Only Cookie 中的 JWT。
 * Token Request 会限制用户只能订阅自己的通知频道。
 *
 * @param serverConfig - 服务器配置（可选）
 * @returns Token Request 对象或错误信息
 *
 * @example
 * ```typescript
 * // 客户端调用
 * const result = await getAblyTokenRequest();
 * if (result.success && result.data) {
 *   // 使用 tokenRequest 连接 Ably
 *   const { tokenRequest, userUid } = result.data;
 * }
 * ```
 */
export async function getAblyTokenRequest(serverConfig: {
  environment: "serverless";
}): Promise<NextResponse<ApiResponse<AblyTokenRequestData>>>;
export async function getAblyTokenRequest(
  serverConfig?: AblyActionConfig,
): Promise<ApiResponse<AblyTokenRequestData>>;
export async function getAblyTokenRequest(
  serverConfig?: AblyActionConfig,
): Promise<ActionResult<AblyTokenRequestData | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers(), "getAblyTokenRequest"))) {
    return response.tooManyRequests();
  }

  // 检查 Ably 是否启用
  const apiKey = await getAblyApiKey();
  if (!apiKey) {
    return response.serviceUnavailable({
      message: "Ably 服务未配置",
      error: {
        code: "ABLY_NOT_CONFIGURED",
        message: "Ably API key not configured",
      },
    });
  }

  // 验证用户身份（自动从 HTTP-Only Cookie 读取 JWT）
  const user = await authVerify({
    allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
  });

  if (!user) {
    return response.unauthorized({
      message: "未登录",
    });
  }

  try {
    const client = new Ably.Rest({ key: apiKey });

    // 生成带权限限制的 Token Request
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: `user:${user.uid}`,
      capability: {
        [`user:${user.uid}`]: ["subscribe", "presence"], // 允许订阅自己的 Channel 和使用 Presence
        "chat:*": ["subscribe", "publish", "presence"], // 允许订阅和发布任何聊天频道（用于私信已读同步）
      },
      ttl: 3600000, // 1 小时有效期
    });

    return response.ok({
      message: "Ably token 获取成功",
      data: {
        tokenRequest,
        userUid: user.uid,
      },
    }) as unknown as ActionResult<AblyTokenRequestData | null>;
  } catch (error) {
    console.error("[Ably] Token generation failed:", error);
    return response.serverError({
      message: "Ably token 生成失败",
      error: {
        code: "ABLY_TOKEN_GENERATION_FAILED",
        message:
          error instanceof Error ? error.message : "Token generation failed",
      },
    });
  }
}
