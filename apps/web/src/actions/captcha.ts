"use server";

import { CaptchaVerifyRequestSchema } from "@repo/shared-types/api/captcha";
import { headers } from "next/headers";

import { cap } from "@/lib/server/captcha";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import { validateData } from "@/lib/server/validator";

export async function createChallenge(serverConfig?: {
  environment?: "serverless" | "serveraction";
}) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "createChallenge"))) {
    return response.tooManyRequests();
  }

  try {
    const data = await cap.createChallenge({
      challengeCount: 50,
      challengeSize: 32,
      challengeDifficulty: 5,
      expiresMs: 600000,
    });

    return response.ok({
      data: data,
    });
  } catch (error) {
    console.error("Create captcha error:", error);
    return response.serverError({
      message: "创建验证码失败，请稍后重试",
    });
  }
}

export async function verifyChallenge(
  {
    token,
    solutions,
  }: {
    token: string;
    solutions: number[];
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "verifyChallenge"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      token,
      solutions,
    },
    CaptchaVerifyRequestSchema,
  );
  if (validationError) return response.badRequest(validationError);

  try {
    const data = await cap.redeemChallenge({ token, solutions });

    return response.ok({
      data: data,
    });
  } catch (error) {
    console.error("Verify captcha error:", error);
    return response.serverError({
      message: "验证验证码失败，请稍后重试",
    });
  }
}
