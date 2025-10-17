"use client";

import { refresh, logout } from "@/actions/auth";
import { useEffect, useRef } from "react";

interface UserInfo {
  uid: number;
  username: string;
  nickname: string;
  exp: string;
  lastRefresh: string;
}

interface BroadcastMessage {
  type:
    | "refresh_intent"
    | "refresh_started"
    | "refresh_completed"
    | "refresh_cancelled";
  timestamp: string;
  tabId?: string;
}

const REFRESH_INTERVAL = 9 * 60 * 1000;
const REFRESH_DELAY = 1000;
const BROADCAST_RANDOM_DELAY_MAX = 200;
const BROADCAST_CHANNEL_NAME = "token_refresh_channel";
const MAX_RETRY_COUNT = 1;
const RETRY_DELAY = 30 * 1000;

const generateTabId = () =>
  `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const getRandomDelay = () =>
  Math.floor(Math.random() * BROADCAST_RANDOM_DELAY_MAX);

export default function TokenManager() {
  const timersRef = useRef({
    main: null as NodeJS.Timeout | null,
    refreshDelay: null as NodeJS.Timeout | null,
    broadcastDelay: null as NodeJS.Timeout | null,
  });
  const stateRef = useRef({
    isRefreshing: false,
    isPendingRefresh: false,
    retryCount: 0,
  });
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(generateTabId());

  useEffect(() => {
    // 从 localStorage 获取用户信息，带验证和错误处理
    const getStoredUserInfo = (): UserInfo | null => {
      try {
        const userInfoStr = localStorage.getItem("user_info");
        if (!userInfoStr) return null;

        const userInfo = JSON.parse(userInfoStr);

        // 验证用户信息格式
        if (
          !userInfo.uid ||
          !userInfo.username ||
          !userInfo.exp ||
          !userInfo.lastRefresh
        ) {
          console.error("Invalid user_info format");
          localStorage.removeItem("user_info");
          return null;
        }

        return userInfo as UserInfo;
      } catch {
        localStorage.removeItem("user_info");
        return null;
      }
    };

    console.log("[TokenManager] Initialized in tab:", tabIdRef.current);

    // 统一的定时器清理函数
    const clearTimer = (timerKey: keyof typeof timersRef.current) => {
      if (timersRef.current[timerKey]) {
        clearTimeout(timersRef.current[timerKey]!);
        timersRef.current[timerKey] = null;
      }
    };

    const clearAllTimers = () => {
      Object.keys(timersRef.current).forEach((key) =>
        clearTimer(key as keyof typeof timersRef.current),
      );
    };

    const broadcastMessage = (
      message: Omit<BroadcastMessage, "tabId">,
      delay = 0,
    ) => {
      const send = () => {
        if (broadcastChannelRef.current) {
          try {
            broadcastChannelRef.current.postMessage({
              ...message,
              tabId: tabIdRef.current,
            });
          } catch {
            //
          }
        }
      };

      if (delay > 0) {
        timersRef.current.broadcastDelay = setTimeout(send, delay);
      } else {
        send();
      }
    };

    const doRefresh = async () => {
      console.log("[TokenManager] Attempting token refresh...");
      if (stateRef.current.isRefreshing) return false;

      stateRef.current.isRefreshing = true;
      stateRef.current.isPendingRefresh = false;

      broadcastMessage({
        type: "refresh_started",
        timestamp: new Date().toISOString(),
      });

      try {
        const userInfo = getStoredUserInfo();
        if (!userInfo) return false;

        const now = new Date();
        const exp = new Date(userInfo.exp);

        if (exp <= now) {
          localStorage.removeItem("user_info");
          return false;
        }

        const result = await refresh({ token_transport: "cookie" });
        const response =
          result instanceof Response ? await result.json() : result;

        if (response.success) {
          const updatedUserInfo: UserInfo = {
            ...userInfo,
            lastRefresh: now.toISOString(),
          };
          localStorage.setItem("user_info", JSON.stringify(updatedUserInfo));

          stateRef.current.retryCount = 0;

          broadcastMessage({
            type: "refresh_completed",
            timestamp: now.toISOString(),
          });

          console.log("[TokenManager] Token refresh successful");

          return true;
        }

        // 刷新失败,根据错误类型决定处理方式
        const errorCode = response.error?.code;
        console.log(
          "[TokenManager] Token refresh failed: " +
            (JSON.stringify(response.error) || "Unknown error"),
        );

        // 如果是 UNAUTHORIZED 错误,直接清除用户信息并登出
        if (errorCode === "UNAUTHORIZED") {
          console.log(
            "[TokenManager] UNAUTHORIZED error detected, logging out immediately",
          );
          localStorage.removeItem("user_info");
          try {
            await logout({ refresh_token: undefined });
          } catch (error) {
            console.error(
              "[TokenManager] Logout after UNAUTHORIZED error:",
              error,
            );
          }
          return false;
        }

        // 其他错误,不清除用户信息,允许重试
        console.log(
          "[TokenManager] Non-UNAUTHORIZED error, will retry if attempts remaining",
        );
        return false;
      } catch {
        return false;
      } finally {
        stateRef.current.isRefreshing = false;
      }
    };

    const scheduleNextRefresh = (delay: number) => {
      const nextRefreshTime = new Date(Date.now() + delay);
      console.log(
        `[TokenManager] Token will refresh at: ${nextRefreshTime.toLocaleString("zh-CN")} (${Math.round(delay / 1000)}s)`,
      );
      timersRef.current.main = setTimeout(checkAndScheduleRefresh, delay);
    };

    const performRefresh = () => {
      if (stateRef.current.isPendingRefresh || stateRef.current.isRefreshing)
        return;

      stateRef.current.isPendingRefresh = true;

      broadcastMessage(
        {
          type: "refresh_intent",
          timestamp: new Date().toISOString(),
        },
        getRandomDelay(),
      );

      const totalDelay = REFRESH_DELAY + BROADCAST_RANDOM_DELAY_MAX;

      timersRef.current.refreshDelay = setTimeout(async () => {
        if (!stateRef.current.isPendingRefresh) return;

        const success = await doRefresh();

        if (success) {
          scheduleNextRefresh(REFRESH_INTERVAL);
        } else if (stateRef.current.retryCount < MAX_RETRY_COUNT) {
          stateRef.current.retryCount++;
          scheduleNextRefresh(RETRY_DELAY);
        } else {
          stateRef.current.retryCount = 0;
        }
      }, totalDelay);
    };

    const cancelPendingRefresh = () => {
      if (!stateRef.current.isPendingRefresh) return;

      stateRef.current.isPendingRefresh = false;
      clearTimer("refreshDelay");
      clearTimer("broadcastDelay");

      broadcastMessage({
        type: "refresh_cancelled",
        timestamp: new Date().toISOString(),
      });
    };

    const checkAndScheduleRefresh = () => {
      clearTimer("main");

      try {
        const userInfo = getStoredUserInfo();
        if (!userInfo) return;

        const now = new Date();
        const lastRefresh = new Date(userInfo.lastRefresh);
        const exp = new Date(userInfo.exp);

        if (exp <= now) {
          localStorage.removeItem("user_info");
          return;
        }

        const nextRefreshTime = new Date(
          lastRefresh.getTime() + REFRESH_INTERVAL,
        );
        const timeUntilNextRefresh = Math.max(
          0,
          nextRefreshTime.getTime() - now.getTime(),
        );

        if (timeUntilNextRefresh === 0) {
          performRefresh();
        } else {
          const nextRefreshTime = new Date(
            now.getTime() + timeUntilNextRefresh,
          );
          console.log(
            `[TokenManager] Token will refresh at ${nextRefreshTime.toLocaleString("zh-CN")} (${Math.round(timeUntilNextRefresh / 1000)}s)`,
          );
          timersRef.current.main = setTimeout(
            performRefresh,
            timeUntilNextRefresh,
          );
        }
      } catch {
        //
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndScheduleRefresh();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user_info") {
        checkAndScheduleRefresh();
      }
    };

    const handleBroadcastMessage = (event: MessageEvent<BroadcastMessage>) => {
      const { type, tabId } = event.data;

      if (tabId === tabIdRef.current) return;

      if (type === "refresh_intent" || type === "refresh_started") {
        if (stateRef.current.isPendingRefresh) {
          cancelPendingRefresh();
        }
        clearTimer("main");
      } else if (type === "refresh_completed") {
        if (stateRef.current.isPendingRefresh) {
          stateRef.current.isPendingRefresh = false;
          clearTimer("refreshDelay");
        }
        checkAndScheduleRefresh();
      }
    };

    // 初始化广播频道
    if (typeof BroadcastChannel !== "undefined") {
      try {
        broadcastChannelRef.current = new BroadcastChannel(
          BROADCAST_CHANNEL_NAME,
        );
        broadcastChannelRef.current.addEventListener(
          "message",
          handleBroadcastMessage,
        );
      } catch {
        //
      }
    }

    checkAndScheduleRefresh();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearAllTimers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      stateRef.current.isPendingRefresh = false;

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener(
          "message",
          handleBroadcastMessage,
        );
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, []);

  return null;
}
