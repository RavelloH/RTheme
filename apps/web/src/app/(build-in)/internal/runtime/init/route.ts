import type { NextRequest } from "next/server";

import { validateInternalBearerToken } from "@/lib/server/internal-auth";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import { runInternalRuntimeInitialization } from "@/lib/server/runtime-init";
import { parseBearerToken } from "@/lib/shared/cache-bootstrap-auth";

const response = new ResponseBuilder("serverless");
const RATE_LIMIT_API_NAME = "internal.runtime.init";

export async function POST(request: NextRequest): Promise<Response> {
  if (!(await limitControl(request.headers, RATE_LIMIT_API_NAME))) {
    return response.tooManyRequests() as Response;
  }

  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return response.unauthorized({
      message: "缺少或非法 Authorization",
      error: {
        code: "RUNTIME_INIT_UNAUTHORIZED",
        message: "缺少或非法 Authorization",
      },
    }) as Response;
  }

  const authResult = validateInternalBearerToken(
    request.headers.get("authorization"),
  );
  if (!authResult.ok && authResult.reason === "MASTER_SECRET_UNAVAILABLE") {
    return response.serviceUnavailable({
      message: "MASTER_SECRET 不可用，无法校验请求",
      error: {
        code: "RUNTIME_INIT_MASTER_SECRET_UNAVAILABLE",
        message: "MASTER_SECRET 不可用，无法校验请求",
      },
    }) as Response;
  }

  if (!authResult.ok) {
    return response.unauthorized({
      message: "认证失败",
      error: {
        code: "RUNTIME_INIT_UNAUTHORIZED",
        message: "认证失败",
      },
    }) as Response;
  }

  try {
    const result = await runInternalRuntimeInitialization();
    return response.ok({
      message: result.reused
        ? "运行期初始化已完成，跳过重复执行"
        : "运行期初始化执行完成",
      data: {
        completedAt: result.completedAt,
        reused: result.reused,
      },
    }) as Response;
  } catch (error) {
    return response.serverError({
      message: "运行期初始化失败",
      error: {
        code: "RUNTIME_INIT_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
    }) as Response;
  }
}
