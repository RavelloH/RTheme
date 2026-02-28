// @/hooks/useMobile.ts
import { useCallback, useSyncExternalStore } from "react";

const MOBILE_UA_RE =
  /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

/**
 * 检测当前设备是否为移动端（基于 UA + 触控 + 屏幕宽度）
 * 使用 useSyncExternalStore 避免 SSR → 客户端双渲染
 */
function checkIsMobile(): boolean {
  const isMobileDevice = MOBILE_UA_RE.test(navigator.userAgent);
  const hasTouchSupport =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileDevice || (hasTouchSupport && isSmallScreen);
}

function subscribeMobile(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    checkIsMobile,
    getServerSnapshot,
  );
}

/**
 * 可自定义断点的版本
 * @param breakpoint - 屏幕宽度断点（像素，默认 768）
 */
function subscribeBreakpoint(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export function useBreakpoint(breakpoint: number = 768): boolean {
  const getSnapshot = useCallback(
    () => window.innerWidth <= breakpoint,
    [breakpoint],
  );
  return useSyncExternalStore(
    subscribeBreakpoint,
    getSnapshot,
    getServerSnapshot,
  );
}
