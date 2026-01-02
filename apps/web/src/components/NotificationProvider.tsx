"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { getAblyTokenRequest } from "@/actions/ably";
import { getUnreadNoticeCount } from "@/actions/notice";
import UnreadNoticeTracker from "./UnreadNoticeTracker";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import NotificationToast, { type NotificationItem } from "./NotificationToast";

// 动态导入 Ably 类型
import type {
  Realtime,
  TokenParams,
  TokenRequest,
  TokenDetails,
  ErrorInfo,
  Message,
} from "ably";

type AblyRealtime = Realtime;

/**
 * 从 localStorage 获取用户信息
 */
const getUserInfoFromStorage = (): { uid: number } | null => {
  try {
    const userInfo = localStorage.getItem("user_info");
    if (!userInfo) return null;

    const data = JSON.parse(userInfo);
    if (typeof data.uid === "number") {
      return { uid: data.uid };
    }
    return null;
  } catch (error) {
    console.error("[Notification] Failed to parse user_info:", error);
    return null;
  }
};

/**
 * 检查是否正在加载未读数量
 */
const isLoadingUnreadCount = (): boolean => {
  try {
    const loading = sessionStorage.getItem("unread_notice_loading");
    if (!loading) return false;

    const timestamp = parseInt(loading, 10);
    // 如果加载标志超过 10 秒，认为已过期
    return Date.now() - timestamp < 10000;
  } catch {
    return false;
  }
};

/**
 * 设置正在加载标志
 */
const setLoadingUnreadCount = (loading: boolean) => {
  try {
    if (loading) {
      sessionStorage.setItem("unread_notice_loading", Date.now().toString());
    } else {
      // 延迟清除标志，给 StrictMode 的第二次 mount 留出时间
      setTimeout(() => {
        sessionStorage.removeItem("unread_notice_loading");
      }, 3000);
    }
  } catch {
    // 忽略错误
  }
};

/**
 * 连接状态类型
 */
export type ConnectionStatus =
  | "idle" // 未连接
  | "connecting" // 连接中
  | "connected" // 已连接
  | "disconnected" // 断开连接
  | "suspended" // 连接挂起
  | "failed" // 连接失败
  | "fallback"; // 使用轮询回退

/**
 * 通知上下文值
 */
interface NotificationContextValue {
  connectionStatus: ConnectionStatus;
  unreadCount: number;
}

/**
 * 通知上下文
 */
const NotificationContext = createContext<NotificationContextValue>({
  connectionStatus: "fallback",
  unreadCount: 0,
});

/**
 * 未读通知更新消息类型
 */
interface UnreadNoticeUpdateMessage {
  type: "unread_notice_update";
  count: number;
}

/**
 * 通知 Provider 属性
 */
interface NotificationProviderProps {
  children: ReactNode;
  isAblyEnabled: boolean; // 从 layout 传递
}

/**
 * 通知 Provider 组件
 *
 * 管理 Ably WebSocket 连接和通知状态。
 * 如果 Ably 未启用或连接失败，会自动回退到轮询机制。
 *
 * @param props - 组件属性
 * @param props.children - 子组件
 * @param props.isAblyEnabled - 是否启用 Ably（从服务端传递）
 *
 * @example
 * ```tsx
 * // 在 layout.tsx 中使用
 * <NotificationProvider isAblyEnabled={isAblyEnabled()}>
 *   {children}
 * </NotificationProvider>
 * ```
 */
export default function NotificationProvider({
  children,
  isAblyEnabled,
}: NotificationProviderProps) {
  const { broadcast } = useBroadcastSender<UnreadNoticeUpdateMessage>();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const ablyClientRef = useRef<AblyRealtime | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AblyRef = useRef<typeof import("ably") | null>(null);
  const userUidRef = useRef<number | null>(null); // 存储用户 UID

  const MAX_RETRIES = 5;

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // 清理重试定时器
  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  // 计算重连延迟（指数退避 + 随机抖动）
  const getReconnectDelay = (retryCount: number): number => {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const multiplier = 2;

    const delay = Math.min(
      baseDelay * Math.pow(multiplier, retryCount),
      maxDelay,
    );

    // 添加随机抖动 (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  };

  // 回退到轮询模式
  const fallbackToPolling = useCallback(() => {
    console.log("[Ably] Falling back to polling mode");
    setConnectionStatus("fallback");
    clearRetryTimeout();

    // 关闭 Ably 连接
    if (ablyClientRef.current) {
      ablyClientRef.current.close();
      ablyClientRef.current = null;
    }
  }, []);

  // 首次加载时获取未读通知数量和用户 UID
  useEffect(() => {
    const fetchInitialUnreadCount = async () => {
      // 检查是否已有其他实例正在加载
      if (isLoadingUnreadCount()) {
        console.log("[Notification] Already loading, skipping");
        return;
      }

      try {
        // 设置加载标志
        setLoadingUnreadCount(true);

        // 从 localStorage 读取用户 UID
        const userInfo = getUserInfoFromStorage();
        if (userInfo) {
          userUidRef.current = userInfo.uid;
          console.log("[Notification] User UID:", userInfo.uid);
        }

        // 立即设置缓存时间戳，防止其他组件重复调用
        const existingCache = localStorage.getItem("unread_notice_count");
        let cachedCount = 0;

        if (existingCache) {
          try {
            const data = JSON.parse(existingCache);
            if (typeof data.count === "number") {
              cachedCount = data.count;
              setUnreadCount(data.count);
              console.log(
                "[Notification] Loaded cached unread count:",
                data.count,
              );
            }
          } catch {
            // 忽略解析错误
          }
        }

        // 更新缓存时间戳，标记正在获取数据
        localStorage.setItem(
          "unread_notice_count",
          JSON.stringify({ count: cachedCount, cachedAt: Date.now() }),
        );

        // 调用 API 获取最新数据
        const result = await getUnreadNoticeCount();
        if (result.success && result.data) {
          const count = result.data.count;
          setUnreadCount(count);

          // 更新缓存
          localStorage.setItem(
            "unread_notice_count",
            JSON.stringify({ count, cachedAt: Date.now() }),
          );

          // 广播给其他组件
          broadcast({ type: "unread_notice_update", count });

          console.log("[Notification] Initial unread count:", count);
        }
      } catch (error) {
        console.error(
          "[Notification] Failed to fetch initial unread count:",
          error,
        );
      } finally {
        // 清除加载标志
        setLoadingUnreadCount(false);
      }
    };

    fetchInitialUnreadCount();
  }, [broadcast]);

  // 初始化 Ably 连接
  useEffect(() => {
    // 如果未启用 Ably，直接使用轮询回退
    if (!isAblyEnabled) {
      console.log("[Ably] Not enabled, using polling fallback");
      setConnectionStatus("fallback");
      return;
    }

    console.log("[Ably] Initializing connection...");
    setConnectionStatus("connecting");

    let isMounted = true; // 跟踪组件挂载状态

    // 动态导入 Ably（仅在客户端）
    import("ably")
      .then((AblyModule) => {
        // 如果组件已卸载，不创建连接
        if (!isMounted) {
          console.log("[Ably] Component unmounted, skipping connection");
          return;
        }

        AblyRef.current = AblyModule;
        const Ably = AblyModule;

        // 创建 Ably 客户端
        const client = new Ably.Realtime({
          authCallback: async (
            tokenParams: TokenParams,
            callback: (
              error: string | ErrorInfo | null,
              tokenRequestOrDetails:
                | string
                | TokenRequest
                | TokenDetails
                | null,
            ) => void,
          ) => {
            try {
              console.log("[Ably] Requesting token...");
              const result = await getAblyTokenRequest();

              if (result.success && result.data?.tokenRequest) {
                console.log("[Ably] Token acquired successfully");
                callback(null, result.data.tokenRequest);
              } else {
                const errorInfo: ErrorInfo = {
                  name: "AuthenticationError",
                  message:
                    result.error?.message ||
                    result.message ||
                    "Failed to get token",
                  code: 40100,
                  statusCode: 401,
                };
                callback(errorInfo, null);
              }
            } catch (error) {
              console.error("[Ably] Auth failed:", error);
              const errorInfo: ErrorInfo = {
                name: "AuthenticationError",
                message:
                  error instanceof Error ? error.message : "Unknown error",
                code: 40100,
                statusCode: 401,
              };
              callback(errorInfo, null);
              // 认证失败，回退到轮询
              if (isMounted) {
                fallbackToPolling();
              }
            }
          },
        });

        // 监听连接状态
        client.connection.on("connected", () => {
          console.log("[Ably] Connected");
          if (isMounted) {
            setConnectionStatus("connected");
            retryCountRef.current = 0; // 重置重试计数
            clearRetryTimeout();
          }
        });

        client.connection.on("connecting", () => {
          console.log("[Ably] Connecting...");
          if (isMounted) {
            setConnectionStatus("connecting");
          }
        });

        client.connection.on("disconnected", () => {
          console.log("[Ably] Disconnected");
          if (isMounted) {
            setConnectionStatus("disconnected");

            // 尝试重连
            if (retryCountRef.current < MAX_RETRIES) {
              const delay = getReconnectDelay(retryCountRef.current);
              console.log(
                `[Ably] Retrying connection in ${Math.round(delay / 1000)}s (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`,
              );

              retryTimeoutRef.current = setTimeout(() => {
                retryCountRef.current++;
                client.connect();
              }, delay);
            } else {
              console.error("[Ably] Max retries reached");
              fallbackToPolling();
            }
          }
        });

        client.connection.on("suspended", () => {
          console.warn("[Ably] Connection suspended");
          if (isMounted) {
            setConnectionStatus("suspended");
            fallbackToPolling();
          }
        });

        client.connection.on("failed", () => {
          console.error("[Ably] Connection failed");
          if (isMounted) {
            setConnectionStatus("failed");
            fallbackToPolling();
          }
        });

        ablyClientRef.current = client;
      })
      .catch((error) => {
        console.error("[Ably] Failed to load Ably module:", error);
        if (isMounted) {
          fallbackToPolling();
        }
      });

    return () => {
      isMounted = false; // 标记组件已卸载
      clearRetryTimeout();
      if (ablyClientRef.current) {
        console.log("[Ably] Cleaning up connection");
        ablyClientRef.current.close();
        ablyClientRef.current = null;
      }
    };
  }, [isAblyEnabled, fallbackToPolling]);

  // 订阅通知频道
  useEffect(() => {
    if (
      !ablyClientRef.current ||
      connectionStatus !== "connected" ||
      !isAblyEnabled ||
      !userUidRef.current // 确保有用户 UID
    ) {
      return;
    }

    const channelName = `user:${userUidRef.current}`;
    console.log(`[Ably] Subscribing to channel: ${channelName}`);

    const channel = ablyClientRef.current.channels.get(channelName);

    const messageHandler = (message: Message) => {
      console.log("[Ably] Received notification:", message.data);

      try {
        const { type, payload } = message.data;

        // 处理新通知（显示 Toast）
        if (type === "new_notice") {
          const { id, title, content, link, createdAt, count } = payload;

          setNotifications((prev) => {
            // 避免重复
            if (prev.some((n) => n.id === id)) {
              return prev;
            }

            const newNotification = { id, title, content, link, createdAt };

            // 如果已经有5个通知，先移除最旧的，再延迟添加新通知
            if (prev.length >= 5) {
              // 移除最旧的（数组最后一个，因为新的在开头）
              const withoutOldest = prev.slice(0, 4);

              // 延迟添加新通知，等待退出动画完成（约300ms）
              setTimeout(() => {
                setNotifications((current) => {
                  // 再次检查是否已存在（避免重复）
                  if (current.some((n) => n.id === id)) {
                    return current;
                  }
                  // 添加到开头
                  return [newNotification, ...current];
                });
              }, 350); // 等待退出动画完成

              return withoutOldest;
            }

            // 如果少于5个，直接添加
            return [newNotification, ...prev];
          });

          // 更新未读数
          if (typeof count === "number") {
            setUnreadCount(count);

            // 同步到 localStorage
            localStorage.setItem(
              "unread_notice_count",
              JSON.stringify({ count, cachedAt: Date.now() }),
            );

            // 广播给其他组件
            broadcast({ type: "unread_notice_update", count });

            // 触发自定义事件
            window.dispatchEvent(
              new CustomEvent("localStorageUpdate", {
                detail: { key: "unread_notice_count" },
              }),
            );
          }
        }
        // 处理未读数更新（仅更新数字，不显示 Toast）
        else if (
          type === "unread_count_update" &&
          typeof payload.count === "number"
        ) {
          setUnreadCount(payload.count);

          // 同步到 localStorage
          localStorage.setItem(
            "unread_notice_count",
            JSON.stringify({ count: payload.count, cachedAt: Date.now() }),
          );

          // 广播给其他组件
          broadcast({ type: "unread_notice_update", count: payload.count });

          // 触发自定义事件（用于同标签页其他组件监听）
          window.dispatchEvent(
            new CustomEvent("localStorageUpdate", {
              detail: { key: "unread_notice_count" },
            }),
          );
        }
      } catch (error) {
        console.error("[Ably] Failed to process notification:", error);
      }
    };

    channel.subscribe("notification", messageHandler);

    return () => {
      channel.unsubscribe("notification", messageHandler);
    };
  }, [connectionStatus, isAblyEnabled, broadcast]);

  return (
    <NotificationContext.Provider value={{ connectionStatus, unreadCount }}>
      {/* 仅在回退模式时启用轮询组件 */}
      {connectionStatus === "fallback" && <UnreadNoticeTracker />}
      {/* 通知 Toast 显示 */}
      <NotificationToast
        notifications={notifications}
        onRemove={removeNotification}
      />
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * 使用通知上下文的 Hook
 *
 * @returns 通知上下文值（连接状态和未读数量）
 *
 * @example
 * ```tsx
 * const { connectionStatus, unreadCount } = useNotification();
 * ```
 */
export const useNotification = () => useContext(NotificationContext);
