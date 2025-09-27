"use server";

import limitControl from "@/lib/server/rateLimit";
import ResponseBuilder from "@/lib/server/response";
import Cap from "@cap.js/server";
import Redis from "ioredis";
import { headers } from "next/headers";

// 根据环境变量决定是否使用Redis
const useRedis = !!process.env.REDIS_URL;
const redis = useRedis
  ? new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: 0,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      commandTimeout: 5000,
    })
  : null;

// 连接状态标记
let isReconnecting = false;

// 添加错误处理，防止无限重连
if (redis) {
  redis.on("error", () => {
    isReconnecting = false;
    redis.disconnect();
  });

  redis.on("close", () => {
    console.log("Redis connection closed");
    isReconnecting = false;
  });

  redis.on("connect", () => {
    console.log("Redis connected successfully");
    isReconnecting = false;
  });
}

const cap = new Cap({
  storage: {
    challenges: {
      store: async (token, challengeData) => {
        if (!useRedis || !redis) {
          throw new Error("Redis not configured");
        }

        try {
          // 检查Redis连接状态，如果断开则尝试重连
          if (
            (redis.status === "close" ||
              redis.status === "end" ||
              redis.status === "wait") &&
            !isReconnecting
          ) {
            console.log(
              `Redis status: ${redis.status}, attempting to reconnect...`,
            );
            isReconnecting = true;
            await redis.connect();
          }

          // 使用 SETEX 命令设置带有过期时间的键
          const ttl = Math.floor((challengeData.expires - Date.now()) / 1000);
          if (ttl > 0) {
            await redis.setex(
              `captcha:challenge:${token}`,
              ttl,
              JSON.stringify(challengeData),
            );
          }
        } catch (error) {
          console.error("Redis store challenge failed:", error);
          throw new Error(`Redis store challenge failed: ${error}`);
        }
      },
      read: async (token) => {
        if (!useRedis || !redis) {
          throw new Error("Redis not configured");
        }

        try {
          // 检查Redis连接状态，如果断开则尝试重连
          if (
            (redis.status === "close" ||
              redis.status === "end" ||
              redis.status === "wait") &&
            !isReconnecting
          ) {
            console.log(
              `Redis status: ${redis.status}, attempting to reconnect...`,
            );
            isReconnecting = true;
            await redis.connect();
          }

          const data = await redis.get(`captcha:challenge:${token}`);
          if (!data) {
            return null;
          }

          const challengeData = JSON.parse(data);
          // 检查是否过期
          if (challengeData.expires <= Date.now()) {
            await redis.del(`captcha:challenge:${token}`);
            return null;
          }

          return { challenge: challengeData, expires: challengeData.expires };
        } catch (error) {
          console.error("Redis read challenge failed:", error);
          return null;
        }
      },
      delete: async (token) => {
        if (!useRedis || !redis) {
          throw new Error("Redis not configured");
        }

        try {
          await redis.del(`captcha:challenge:${token}`);
        } catch (error) {
          console.error("Redis delete challenge failed:", error);
          throw new Error(`Redis delete challenge failed: ${error}`);
        }
      },
      deleteExpired: async () => {
        // Redis 会自动删除过期键，无需手动清理
        // 这里可以留空或者添加其他清理逻辑
      },
    },
    tokens: {
      store: async (tokenKey, expires) => {
        if (!useRedis || !redis) {
          throw new Error("Redis not configured");
        }

        try {
          // 检查Redis连接状态，如果断开则尝试重连
          if (
            (redis.status === "close" ||
              redis.status === "end" ||
              redis.status === "wait") &&
            !isReconnecting
          ) {
            console.log(
              `Redis status: ${redis.status}, attempting to reconnect...`,
            );
            isReconnecting = true;
            await redis.connect();
          }

          // 使用 SETEX 命令设置带有过期时间的键
          const ttl = Math.floor((expires - Date.now()) / 1000);
          if (ttl > 0) {
            await redis.setex(
              `captcha:token:${tokenKey}`,
              ttl,
              expires.toString(),
            );
          }
        } catch (error) {
          console.error("Redis store token failed:", error);
          throw new Error(`Redis store token failed: ${error}`);
        }
      },
      get: async (tokenKey) => {
        if (!useRedis || !redis) {
          throw new Error("Redis not configured");
        }

        try {
          // 检查Redis连接状态，如果断开则尝试重连
          if (
            (redis.status === "close" ||
              redis.status === "end" ||
              redis.status === "wait") &&
            !isReconnecting
          ) {
            console.log(
              `Redis status: ${redis.status}, attempting to reconnect...`,
            );
            isReconnecting = true;
            await redis.connect();
          }

          const data = await redis.get(`captcha:token:${tokenKey}`);
          if (!data) {
            return null;
          }

          const expires = parseInt(data, 10);
          // 检查是否过期
          if (expires <= Date.now()) {
            await redis.del(`captcha:token:${tokenKey}`);
            return null;
          }

          return expires;
        } catch (error) {
          console.error("Redis get token failed:", error);
          return null;
        }
      },
      delete: async (tokenKey) => {
        if (!useRedis || !redis) {
          throw new Error("Redis not configured");
        }

        try {
          await redis.del(`captcha:token:${tokenKey}`);
        } catch (error) {
          console.error("Redis delete token failed:", error);
          throw new Error(`Redis delete token failed: ${error}`);
        }
      },
      deleteExpired: async () => {
        return;
      },
    },
  },
});

export async function createChallenge(serverConfig?: {
  environment?: "serverless" | "serveraction";
}) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
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

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

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

// Server Only
export async function verifyToken(token: string) {
  try {
    const isValid = await cap.validateToken(token, {
      keepToken: false,
    });
    return isValid;
  } catch (error) {
    console.error("Verify captcha token error:", error);
    return { success: false };
  }
}
