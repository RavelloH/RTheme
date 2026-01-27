import "server-only";
import { cookies } from "next/headers";
import type { AccessTokenPayload } from "@/lib/server/jwt";
import { jwtTokenVerify } from "@/lib/server/jwt";

/**
 * 用户角色类型
 */
export type UserRole = "USER" | "ADMIN" | "EDITOR" | "AUTHOR";

/**
 * 身份验证选项
 */
export interface AuthVerifyOptions {
  /** 允许的用户角色列表 */
  allowedRoles: UserRole[];
  /** 可选的访问令牌,未提供则从 cookie 中读取 */
  accessToken?: string;
}

/**
 * 验证用户身份和权限
 *
 * @param options - 验证选项
 * @returns 验证成功返回用户信息,失败返回 null
 *
 */
export async function authVerify(
  options: AuthVerifyOptions,
): Promise<AccessTokenPayload | null> {
  const { allowedRoles, accessToken } = options;

  // 获取 token
  let token = accessToken;
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("ACCESS_TOKEN")?.value;
  }

  // 验证 token 是否存在
  if (!token) {
    return null;
  }

  // 验证 token 有效性
  const user = await jwtTokenVerify<AccessTokenPayload>(token);
  if (!user) {
    return null;
  }

  // 验证用户角色权限
  if (!allowedRoles.includes(user.role as UserRole)) {
    return null;
  }

  return user;
}
