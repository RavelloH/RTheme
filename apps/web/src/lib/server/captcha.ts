import "server-only";
import Cap from "@cap.js/server";
import redis, { ensureRedisConnection } from "@/lib/server/redis";

export const cap = new Cap({
  storage: {
    challenges: {
      store: async (token, challengeData) => {
        try {
          await ensureRedisConnection();

          // 使用 SETEX 命令设置带有过期时间的键
          const ttl = Math.floor((challengeData.expires - Date.now()) / 1000);
          if (ttl > 0) {
            await redis.setex(
              `np:captcha:challenge:${token}`,
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
        try {
          await ensureRedisConnection();

          const data = await redis.get(`np:captcha:challenge:${token}`);
          if (!data) {
            return null;
          }

          const challengeData = JSON.parse(data);
          // 检查是否过期
          if (challengeData.expires <= Date.now()) {
            await redis.del(`np:captcha:challenge:${token}`);
            return null;
          }

          return { challenge: challengeData, expires: challengeData.expires };
        } catch (error) {
          console.error("Redis read challenge failed:", error);
          return null;
        }
      },
      delete: async (token) => {
        try {
          await redis.del(`np:captcha:challenge:${token}`);
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
        try {
          await ensureRedisConnection();

          // 使用 SETEX 命令设置带有过期时间的键
          const ttl = Math.floor((expires - Date.now()) / 1000);
          if (ttl > 0) {
            await redis.setex(
              `np:captcha:token:${tokenKey}`,
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
        try {
          await ensureRedisConnection();

          const data = await redis.get(`np:captcha:token:${tokenKey}`);
          if (!data) {
            return null;
          }

          const expires = parseInt(data, 10);
          // 检查是否过期
          if (expires <= Date.now()) {
            await redis.del(`np:captcha:token:${tokenKey}`);
            return null;
          }

          return expires;
        } catch (error) {
          console.error("Redis get token failed:", error);
          return null;
        }
      },
      delete: async (tokenKey) => {
        try {
          await redis.del(`np:captcha:token:${tokenKey}`);
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
