"use client";

export interface RecentVisitItem {
  path: string;
  title: string;
  visitedAt: string;
}

export const RECENT_VISITS_STORAGE_KEY = "np_recent_visits";
export const RECENT_VISITS_EVENT = "np-recent-visits-updated";

const MAX_RECENT_VISITS = 50;
const EXCLUDED_PATH_PREFIXES = ["/admin"];
const EXCLUDED_PATHS = new Set([
  "/login",
  "/register",
  "/logout",
  "/reset-password",
  "/email-verify",
  "/reauth",
]);

function toTimestamp(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeTitle(path: string, title?: string): string {
  const trimmed = title?.trim();
  if (!trimmed) return path;
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

function shouldTrackPath(path: string): boolean {
  if (EXCLUDED_PATHS.has(path)) return false;
  return !EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function dispatchRecentVisitsUpdate(items: RecentVisitItem[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(RECENT_VISITS_EVENT, {
      detail: { items, count: items.length },
    }),
  );
}

interface RawRecentVisitItem {
  path: string;
  title: string;
  visitedAt: string;
}

function isRawRecentVisitItem(value: unknown): value is RawRecentVisitItem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { path?: unknown }).path === "string" &&
    typeof (value as { title?: unknown }).title === "string" &&
    typeof (value as { visitedAt?: unknown }).visitedAt === "string"
  );
}

function sanitizeItems(value: unknown): RecentVisitItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRawRecentVisitItem)
    .map((item) => ({
      path: normalizePath(item.path),
      title: normalizeTitle(item.path, item.title),
      visitedAt: item.visitedAt,
    }))
    .sort((a, b) => toTimestamp(b.visitedAt) - toTimestamp(a.visitedAt))
    .slice(0, MAX_RECENT_VISITS);
}

export function readRecentVisits(): RecentVisitItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(RECENT_VISITS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeItems(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeRecentVisits(items: RecentVisitItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECENT_VISITS_STORAGE_KEY, JSON.stringify(items));
  dispatchRecentVisitsUpdate(items);
}

export function recordRecentVisit(input: {
  path: string;
  title?: string;
  visitedAt?: string;
}): void {
  if (typeof window === "undefined") return;

  const path = normalizePath(input.path);
  const pathname = path.split("?")[0] || path;

  if (!shouldTrackPath(pathname)) {
    return;
  }

  const nextItem: RecentVisitItem = {
    path,
    title: normalizeTitle(path, input.title),
    visitedAt: input.visitedAt || new Date().toISOString(),
  };

  const current = readRecentVisits();
  const next = [nextItem, ...current].slice(0, MAX_RECENT_VISITS);
  writeRecentVisits(next);
}

export function clearRecentVisits(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_VISITS_STORAGE_KEY);
  dispatchRecentVisitsUpdate([]);
}

export function subscribeRecentVisits(
  onChange: (items: RecentVisitItem[]) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === RECENT_VISITS_STORAGE_KEY) {
      onChange(readRecentVisits());
    }
  };

  const handleCustomEvent = () => {
    onChange(readRecentVisits());
  };

  onChange(readRecentVisits());
  window.addEventListener("storage", handleStorage);
  window.addEventListener(RECENT_VISITS_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(RECENT_VISITS_EVENT, handleCustomEvent);
  };
}
