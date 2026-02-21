import "server-only";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function normalizePageSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "/";

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/g, "/");
  const withoutTrailingSlash = normalized.replace(/\/+$/g, "");
  return withoutTrailingSlash || "/";
}

export function resolvePageAllowComments(config: unknown): boolean {
  if (!isRecord(config)) return false;
  const value = config.allowComments;

  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }

  return false;
}
