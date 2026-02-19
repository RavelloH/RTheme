"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { recordRecentVisit } from "@/lib/client/recent-visits";

const TRACK_INITIAL_DELAY_MS = 160;
const TRACK_MAX_WAIT_MS = 1600;
const TRACK_PATH_LIKE_PREFIXES = ["/", "http://", "https://"];

function getReadableTitle(): string {
  if (typeof document === "undefined") return "";

  const currentTitle = document.title || "";
  if (!currentTitle) return "";

  if (!currentTitle.includes(" | ")) {
    return currentTitle.trim();
  }

  const [pageTitle] = currentTitle.split(" | ");
  return (pageTitle || currentTitle).trim();
}

function getMetaTitle(): string {
  if (typeof document === "undefined") return "";

  const ogTitle =
    document
      .querySelector<HTMLMetaElement>('meta[property="og:title"]')
      ?.content?.trim() || "";
  if (ogTitle) return ogTitle;

  return (
    document
      .querySelector<HTMLMetaElement>('meta[name="twitter:title"]')
      ?.content?.trim() || ""
  );
}

function isPathLikeTitle(title: string, path: string): boolean {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedPath = path.trim().toLowerCase();
  if (!normalizedTitle) return true;
  if (normalizedTitle === normalizedPath) return true;

  return TRACK_PATH_LIKE_PREFIXES.some((prefix) =>
    normalizedTitle.startsWith(prefix),
  );
}

export function RecentVisitTracker() {
  const pathname = usePathname();
  const initialTimerRef = useRef<number | null>(null);
  const maxWaitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;

    if (initialTimerRef.current !== null) {
      window.clearTimeout(initialTimerRef.current);
      initialTimerRef.current = null;
    }
    if (maxWaitTimerRef.current !== null) {
      window.clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }

    let isCommitted = false;
    const observer = new MutationObserver(() => {
      void tryCommit(false);
    });

    const cleanup = () => {
      observer.disconnect();
      if (initialTimerRef.current !== null) {
        window.clearTimeout(initialTimerRef.current);
        initialTimerRef.current = null;
      }
      if (maxWaitTimerRef.current !== null) {
        window.clearTimeout(maxWaitTimerRef.current);
        maxWaitTimerRef.current = null;
      }
    };

    const tryCommit = async (force: boolean) => {
      if (isCommitted) return;

      const path = `${window.location.pathname}${window.location.search}`;
      const readableTitle = getReadableTitle();
      const metaTitle = getMetaTitle();
      const finalTitle = readableTitle || metaTitle;
      const canCommit = !isPathLikeTitle(finalTitle, path);

      if (!force && !canCommit) return;

      isCommitted = true;
      cleanup();

      recordRecentVisit({
        path,
        title: finalTitle || path,
      });
    };

    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["content"],
    });

    initialTimerRef.current = window.setTimeout(() => {
      void tryCommit(false);
    }, TRACK_INITIAL_DELAY_MS);

    maxWaitTimerRef.current = window.setTimeout(() => {
      void tryCommit(true);
    }, TRACK_MAX_WAIT_MS);

    return () => {
      cleanup();
    };
  }, [pathname]);

  return null;
}
