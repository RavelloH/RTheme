export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
}

function parseOptionalInt(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseRedisConnectionOptions(
  redisUrl: string,
): RedisConnectionOptions {
  let parsed: URL;
  try {
    parsed = new URL(redisUrl);
  } catch {
    throw new Error("Invalid REDIS_URL format");
  }

  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error(
      `Unsupported REDIS_URL protocol: ${parsed.protocol}. Expected redis: or rediss:`,
    );
  }

  const portFromUrl = parseOptionalInt(parsed.port);
  const dbFromPath = parseOptionalInt(parsed.pathname.replace(/^\/+/, ""));

  return {
    host: parsed.hostname || "127.0.0.1",
    port: portFromUrl ?? 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: dbFromPath,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
}
