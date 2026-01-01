"use client";

import { useEffect, useRef } from "react";
import { getUnreadNoticeCount } from "@/actions/notice";
import { useBroadcastSender } from "@/hooks/use-broadcast";

interface BroadcastMessage {
  type: "check_intent" | "check_started" | "check_completed";
  timestamp: string;
  tabId?: string;
  count?: number;
}

interface CachedNoticeCount {
  count: number;
  cachedAt: number;
}

const CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟
const CHECK_DELAY = 1000; // 1秒延迟，用于多页面协调
const BROADCAST_RANDOM_DELAY_MAX = 200; // 随机延迟最大值
const BROADCAST_CHANNEL_NAME = "unread_notice_channel";
const CACHE_KEY = "unread_notice_count";

interface UnreadNoticeUpdateMessage {
  type: "unread_notice_update";
  count: number;
}

const generateTabId = () =>
  `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const getRandomDelay = () =>
  Math.floor(Math.random() * BROADCAST_RANDOM_DELAY_MAX);

export default function UnreadNoticeTracker() {
  const { broadcast } = useBroadcastSender<UnreadNoticeUpdateMessage>();
  const timersRef = useRef({
    main: null as NodeJS.Timeout | null,
    checkDelay: null as NodeJS.Timeout | null,
    broadcastDelay: null as NodeJS.Timeout | null,
  });
  const stateRef = useRef({
    isChecking: false,
    isPendingCheck: false,
    isFirstCheck: true, // 首次检查标志
  });
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(generateTabId());

  useEffect(() => {
    console.log("[UnreadNoticeTracker] Initialized in tab:", tabIdRef.current);

    // 从 localStorage 获取缓存的未读数
    const getCachedCount = (): CachedNoticeCount | null => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data = JSON.parse(cached);
        if (
          typeof data.count === "number" &&
          typeof data.cachedAt === "number"
        ) {
          return data;
        }
        return null;
      } catch {
        return null;
      }
    };

    // 保存未读数到 localStorage
    const setCachedCount = (count: number) => {
      const data: CachedNoticeCount = {
        count,
        cachedAt: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));

      // 使用 broadcast 通知其他组件
      broadcast({ type: "unread_notice_update", count });
    };

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

    const doCheck = async () => {
      console.log("[UnreadNoticeTracker] Checking unread notice count...");
      if (stateRef.current.isChecking) return false;

      stateRef.current.isChecking = true;
      stateRef.current.isPendingCheck = false;

      broadcastMessage({
        type: "check_started",
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await getUnreadNoticeCount();

        if (result.success && result.data) {
          const count = result.data.count;
          setCachedCount(count);

          broadcastMessage({
            type: "check_completed",
            timestamp: new Date().toISOString(),
            count,
          });

          console.log("[UnreadNoticeTracker] Unread count:", count);
          return true;
        }

        console.log(
          "[UnreadNoticeTracker] Check failed:",
          result.message || "Unknown error",
        );
        return false;
      } catch (error) {
        console.error("[UnreadNoticeTracker] Check error:", error);
        return false;
      } finally {
        stateRef.current.isChecking = false;
      }
    };

    const scheduleNextCheck = (delay: number) => {
      const nextCheckTime = new Date(Date.now() + delay);
      console.log(
        `[UnreadNoticeTracker] Next check at: ${nextCheckTime.toLocaleString("zh-CN")} (${Math.round(delay / 1000)}s)`,
      );
      timersRef.current.main = setTimeout(checkAndSchedule, delay);
    };

    const performCheck = (immediate = false) => {
      if (stateRef.current.isPendingCheck || stateRef.current.isChecking)
        return;

      stateRef.current.isPendingCheck = true;

      // 如果是立即检查（首次加载），跳过广播协调直接执行
      if (immediate) {
        console.log(
          "[UnreadNoticeTracker] Immediate check, skipping coordination",
        );
        (async () => {
          await doCheck();
          scheduleNextCheck(CHECK_INTERVAL);
        })();
        return;
      }

      broadcastMessage(
        {
          type: "check_intent",
          timestamp: new Date().toISOString(),
        },
        getRandomDelay(),
      );

      const totalDelay = CHECK_DELAY + BROADCAST_RANDOM_DELAY_MAX;

      timersRef.current.checkDelay = setTimeout(async () => {
        if (!stateRef.current.isPendingCheck) return;

        await doCheck();
        scheduleNextCheck(CHECK_INTERVAL);
      }, totalDelay);
    };

    const cancelPendingCheck = () => {
      if (!stateRef.current.isPendingCheck) return;

      stateRef.current.isPendingCheck = false;
      clearTimer("checkDelay");
      clearTimer("broadcastDelay");
    };

    const checkAndSchedule = () => {
      clearTimer("main");

      try {
        // 首次检查时，无视缓存立即执行
        if (stateRef.current.isFirstCheck) {
          stateRef.current.isFirstCheck = false;
          console.log("[UnreadNoticeTracker] First check, ignoring cache");
          performCheck(true); // 传入 true 表示立即执行
          return;
        }

        const cached = getCachedCount();
        const now = Date.now();

        if (!cached) {
          // 没有缓存，立即检查
          performCheck();
          return;
        }

        const timeSinceLastCheck = now - cached.cachedAt;
        const timeUntilNextCheck = Math.max(
          0,
          CHECK_INTERVAL - timeSinceLastCheck,
        );

        if (timeUntilNextCheck === 0) {
          // 已经过了5分钟，立即检查
          performCheck();
        } else {
          // 还没到5分钟，等待剩余时间
          const nextCheckTime = new Date(now + timeUntilNextCheck);
          console.log(
            `[UnreadNoticeTracker] Next check at ${nextCheckTime.toLocaleString("zh-CN")} (${Math.round(timeUntilNextCheck / 1000)}s)`,
          );
          timersRef.current.main = setTimeout(performCheck, timeUntilNextCheck);
        }
      } catch {
        // 出错时等待完整周期
        scheduleNextCheck(CHECK_INTERVAL);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[UnreadNoticeTracker] Page became visible, rescheduling");
        checkAndSchedule();
      } else {
        console.log("[UnreadNoticeTracker] Page hidden, clearing timers");
        clearAllTimers();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CACHE_KEY) {
        // 其他标签页更新了缓存，重新调度
        checkAndSchedule();
      }
    };

    const handleBroadcastMessage = (event: MessageEvent<BroadcastMessage>) => {
      const { type, tabId, count } = event.data;

      if (tabId === tabIdRef.current) return;

      if (type === "check_intent" || type === "check_started") {
        // 其他标签页正在或准备检查，取消本页面的检查
        if (stateRef.current.isPendingCheck) {
          cancelPendingCheck();
        }
        clearTimer("main");
      } else if (type === "check_completed") {
        // 其他标签页完成检查，更新本地缓存（如果提供了 count）
        if (typeof count === "number") {
          setCachedCount(count);
        }
        // 重新调度下次检查
        checkAndSchedule();
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

    // 初始化：立即检查一次
    checkAndSchedule();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearAllTimers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      stateRef.current.isPendingCheck = false;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
