"use server";
import { NextResponse } from "next/server";
import { updateTag } from "next/cache";
import {
  GetSettingsSchema,
  GetSettings,
  SettingItem,
  UpdateSettingsSchema,
  UpdateSettings,
} from "@repo/shared-types/api/setting";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rate-limit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "@/lib/server/audit";
import { Prisma } from ".prisma/client";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/*
  getSettings - 获取所有配置项
*/
export async function getSettings(
  params: GetSettings,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<SettingItem[] | null>>>;
export async function getSettings(
  params: GetSettings,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<SettingItem[] | null>>;
export async function getSettings(
  { access_token }: GetSettings,
  serverConfig?: ActionConfig,
): Promise<ActionResult<SettingItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getSettings"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
    },
    GetSettingsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 获取所有配置项
    const configs = await prisma.config.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    // 转换数据格式
    const data: SettingItem[] = configs.map((config) => ({
      key: config.key,
      value: config.value,
      updatedAt: config.updatedAt.toISOString(),
    }));

    return response.ok({ data });
  } catch (error) {
    console.error("Get settings error:", error);
    return response.serverError();
  }
}

/*
  updateSettings - 批量更新配置项
*/
export async function updateSettings(
  params: UpdateSettings,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ updated: number } | null>>>;
export async function updateSettings(
  params: UpdateSettings,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ updated: number } | null>>;
export async function updateSettings(
  { access_token, settings }: UpdateSettings,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ updated: number } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "updateSettings"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      settings,
    },
    UpdateSettingsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 查询所有要更新的配置项的旧值
    const keys = settings.map((s) => s.key);
    const oldConfigs = await prisma.config.findMany({
      where: {
        key: {
          in: keys,
        },
      },
    });

    // 构建旧值映射
    const oldValuesMap = new Map(
      oldConfigs.map((config) => [config.key, config.value]),
    );

    // 使用事务批量更新配置项
    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const setting of settings) {
        const result = await tx.config.upsert({
          where: { key: setting.key },
          update: { value: setting.value as Prisma.InputJsonValue },
          create: {
            key: setting.key,
            value: setting.value as Prisma.InputJsonValue,
          },
        });

        if (result) {
          updated++;
        }
      }
    });

    // 记录审计日志
    if (updated > 0) {
      // 构建旧值和新值记录
      const oldData: Record<string, unknown> = {
        settings: settings.map((s) => ({
          key: s.key,
          oldValue: oldValuesMap.get(s.key) || null,
        })),
      };

      const newData: Record<string, unknown> = {
        settings: settings.map((s) => ({
          key: s.key,
          newValue: s.value,
        })),
      };

      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "BULK_UPDATE",
          resourceType: "CONFIG",
          resourceId: keys.join(","),
          value: {
            old: oldData,
            new: newData,
          },
          description: `批量更新 ${updated} 个配置项：${keys.join(", ")}`,
        },
      });
    }

    // 刷新缓存标签
    updateTag("config");

    return response.ok({
      data: { updated },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return response.serverError();
  }
}
