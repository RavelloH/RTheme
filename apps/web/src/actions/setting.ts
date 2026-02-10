"use server";
import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";
import type {
  GetSettings,
  SettingItem,
  UpdateSettings,
} from "@repo/shared-types/api/setting";
import {
  GetSettingsSchema,
  UpdateSettingsSchema,
} from "@repo/shared-types/api/setting";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import type { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/server/audit";
import { authVerify } from "@/lib/server/auth-verify";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import { validateData } from "@/lib/server/validator";

import type { Prisma } from ".prisma/client";

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

import {
  defaultConfigs,
  extractDefaultValue,
  extractOptions,
} from "@/data/default-configs";

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

  // 校验配置值，并过滤出允许写入的配置项
  const sanitizedSettings: typeof settings = [];
  for (const setting of settings) {
    const configDef = defaultConfigs.find((c) => c.key === setting.key);
    if (!configDef) {
      return response.badRequest({
        message: `未知的配置项: ${setting.key}`,
        error: {
          code: "INVALID_CONFIG_KEY",
          message: `未知的配置项: ${setting.key}`,
        },
      });
    }

    const options = extractOptions(configDef.value);
    const newValue = extractDefaultValue(setting.value);
    const defaultValue = extractDefaultValue(configDef.value);

    // 1. Options 校验
    if (options && options.length > 0) {
      const isValid = options.some(
        (opt) => String(opt.value) === String(newValue),
      );
      if (!isValid) {
        return response.badRequest({
          message: `配置项 ${setting.key} 的值无效。允许的值为: ${options.map((o) => o.value).join(", ")}`,
        });
      }
    }

    // 2. 类型推断校验
    if (defaultValue !== undefined && defaultValue !== null) {
      const defaultType = typeof defaultValue;

      if (Array.isArray(defaultValue)) {
        if (!Array.isArray(newValue)) {
          return response.badRequest({
            message: `配置项 ${setting.key} 格式错误。应为数组。`,
          });
        }
        // 简单校验数组元素类型（假设数组元素类型一致且非空数组能推断）
        if (defaultValue.length > 0) {
          const itemType = typeof defaultValue[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const invalidItem = (newValue as any[]).find(
            (item) => typeof item !== itemType,
          );
          if (invalidItem !== undefined) {
            return response.badRequest({
              message: `配置项 ${setting.key} 数组元素类型错误。应为 ${itemType}。`,
            });
          }
        }
      } else if (defaultType === "object") {
        // 普通对象
        if (
          typeof newValue !== "object" ||
          newValue === null ||
          Array.isArray(newValue)
        ) {
          return response.badRequest({
            message: `配置项 ${setting.key} 格式错误。应为对象。`,
          });
        }
      } else {
        // 基本类型：string, number, boolean
        if (typeof newValue !== defaultType) {
          return response.badRequest({
            message: `配置项 ${setting.key} 类型错误。应为 ${defaultType}，实际为 ${typeof newValue}。`,
          });
        }
      }
    }

    sanitizedSettings.push(setting);
  }

  try {
    // 查询所有要更新的配置项的旧值
    const keys = sanitizedSettings.map((s) => s.key);
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
      for (const setting of sanitizedSettings) {
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
        settings: sanitizedSettings.map((s) => ({
          key: s.key,
          oldValue: oldValuesMap.get(s.key) || null,
        })),
      };

      const newData: Record<string, unknown> = {
        settings: sanitizedSettings.map((s) => ({
          key: s.key,
          newValue: s.value,
        })),
      };

      const { after } = await import("next/server");
      after(async () => {
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
