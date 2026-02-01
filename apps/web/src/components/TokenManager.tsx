"use client";

import { useCallback, useEffect, useRef } from "react";

import { logout, refresh } from "@/actions/auth";
import { useBroadcastSender } from "@/hooks/use-broadcast";

interface UserInfo {
  uid: number;
  username: string;
  nickname: string;
  role: string;
  exp: string;
  lastRefresh: string;
  avatar?: string | null;
  email?: string | null;
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

interface UserInfoUpdateMessage {
  type: "user_info_update";
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
  const { broadcast: broadcastUserInfo } =
    useBroadcastSender<UserInfoUpdateMessage>();
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

  const removeUserInfo = useCallback(() => {
    localStorage.removeItem("user_info");
    broadcastUserInfo({ type: "user_info_update" });
  }, [broadcastUserInfo]);

  const getStoredUserInfo = useCallback((): UserInfo | null => {
    try {
      const userInfoStr = localStorage.getItem("user_info");
      if (!userInfoStr) return null;

      const userInfo = JSON.parse(userInfoStr);

      if (
        !userInfo.uid ||
        !userInfo.username ||
        !userInfo.exp ||
        !userInfo.lastRefresh
      ) {
        removeUserInfo();
        return null;
      }

      return userInfo as UserInfo;
    } catch {
      removeUserInfo();
      return null;
    }
  }, [removeUserInfo]);

  const clearTimer = useCallback(
    (timerKey: keyof (typeof timersRef)["current"]) => {
      if (timersRef.current[timerKey]) {
        clearTimeout(timersRef.current[timerKey]!);
        timersRef.current[timerKey] = null;
      }
    },
    [],
  );

  const clearAllTimers = useCallback(() => {
    Object.keys(timersRef.current).forEach((key) =>
      clearTimer(key as keyof (typeof timersRef)["current"]),
    );
  }, [clearTimer]);

  const broadcastMessage = useCallback(
    (message: Omit<BroadcastMessage, "tabId">, delay = 0) => {
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
    },
    [],
  );

  const doRefresh = useCallback(async () => {
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
        removeUserInfo();
        return false;
      }

      const result = await refresh({ token_transport: "cookie" });
      const response =
        result instanceof Response ? await result.json() : result;

      if (response.success && response.data?.userInfo) {
        const updatedUserInfo: UserInfo = {
          uid: response.data.userInfo.uid,
          username: response.data.userInfo.username,
          nickname: response.data.userInfo.nickname,
          role: response.data.userInfo.role,
          exp: response.data.userInfo.exp || userInfo.exp,
          lastRefresh: now.toISOString(),
          avatar: response.data.userInfo.avatar ?? userInfo.avatar ?? null,
          email: response.data.userInfo.email ?? userInfo.email ?? null,
        };
        localStorage.setItem("user_info", JSON.stringify(updatedUserInfo));
        broadcastUserInfo({ type: "user_info_update" });

        stateRef.current.retryCount = 0;
        broadcastMessage({
          type: "refresh_completed",
          timestamp: now.toISOString(),
        });

        return true;
      }

      const errorCode = response.error?.code;
      if (errorCode === "UNAUTHORIZED") {
        removeUserInfo();
        try {
          await logout({ refresh_token: undefined });
        } catch {
          //
        }
        return false;
      }

      return false;
    } catch {
      return false;
    } finally {
      stateRef.current.isRefreshing = false;
    }
  }, [broadcastMessage, broadcastUserInfo, getStoredUserInfo, removeUserInfo]);

  // Forward declarations via ref
  const checkAndScheduleRefreshRef = useRef<() => void>(() => {});

  const scheduleNextRefresh = useCallback((delay: number) => {
    timersRef.current.main = setTimeout(() => {
      checkAndScheduleRefreshRef.current();
    }, delay);
  }, []);

  const performRefresh = useCallback(() => {
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

    timersRef.current.refreshDelay = setTimeout(() => {
      void (async () => {
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
      })();
    }, totalDelay);
  }, [broadcastMessage, doRefresh, scheduleNextRefresh]);

  const cancelPendingRefresh = useCallback(() => {
    if (!stateRef.current.isPendingRefresh) return;

    stateRef.current.isPendingRefresh = false;
    clearTimer("refreshDelay");
    clearTimer("broadcastDelay");

    broadcastMessage({
      type: "refresh_cancelled",
      timestamp: new Date().toISOString(),
    });
  }, [clearTimer, broadcastMessage]);

  const checkAndScheduleRefresh = useCallback(() => {
    clearTimer("main");

    try {
      const userInfo = getStoredUserInfo();
      if (!userInfo) return;

      const now = new Date();
      const lastRefresh = new Date(userInfo.lastRefresh);
      const exp = new Date(userInfo.exp);

      if (exp <= now) {
        removeUserInfo();
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
        timersRef.current.main = setTimeout(
          performRefresh,
          timeUntilNextRefresh,
        );
      }
    } catch {
      //
    }
  }, [clearTimer, getStoredUserInfo, performRefresh, removeUserInfo]);

  useEffect(() => {
    checkAndScheduleRefreshRef.current = checkAndScheduleRefresh;
  }, [checkAndScheduleRefresh]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      checkAndScheduleRefresh();
    }
  }, [checkAndScheduleRefresh]);

  const handleStorageChange = useCallback(
    (e: StorageEvent) => {
      if (e.key === "user_info") {
        checkAndScheduleRefresh();
      }
    },
    [checkAndScheduleRefresh],
  );

  const handleBroadcastMessage = useCallback(
    (event: MessageEvent<BroadcastMessage>) => {
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
    },
    [cancelPendingRefresh, checkAndScheduleRefresh, clearTimer],
  );

  useEffect(() => {
    const userInfo = getStoredUserInfo();
    if (!userInfo) return;

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
  }, [
    getStoredUserInfo,
    handleBroadcastMessage,
    checkAndScheduleRefresh,
    handleVisibilityChange,
    handleStorageChange,
    clearAllTimers,
  ]);

  return null;
}
