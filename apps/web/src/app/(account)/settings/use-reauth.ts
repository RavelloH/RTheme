import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { OAuthProvider } from "@/lib/server/oauth";

export type PendingAction =
  | {
      type: "link";
      data: { provider: OAuthProvider };
    }
  | {
      type: "unlink";
      data: { provider: OAuthProvider };
    }
  | {
      type: "setPassword";
      data: { newPassword: string };
    }
  | {
      type: "changePassword";
      data: { new_password: string };
    }
  | {
      type: "revokeSession";
      data: { sessionId: string };
    }
  | {
      type: "enableTotp";
      data: Record<string, never>;
    }
  | {
      type: "disableTotp";
      data: Record<string, never>;
    }
  | {
      type: "regenerateBackupCodes";
      data: Record<string, never>;
    }
  | {
      type: "updateProfile";
      data: { field: string; value: string };
    };

interface UseReauthOptions {
  onReauthSuccess: () => void;
  onReauthCancelled: () => void;
}

/**
 * Reauth 相关逻辑的自定义 Hook
 */
export const useReauth = ({
  onReauthSuccess,
  onReauthCancelled,
}: UseReauthOptions) => {
  const router = useRouter();
  const reauthWindowRef = useRef<Window | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // 使用 ref 保存回调函数，避免 useEffect 重复执行
  const onReauthSuccessRef = useRef(onReauthSuccess);
  const onReauthCancelledRef = useRef(onReauthCancelled);

  // 每次回调更新时同步 ref
  useEffect(() => {
    onReauthSuccessRef.current = onReauthSuccess;
    onReauthCancelledRef.current = onReauthCancelled;
  }, [onReauthSuccess, onReauthCancelled]);

  // 初始化 BroadcastChannel
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("reauth-channel");
      channelRef.current = channel;

      // 监听 reauth 结果
      channel.onmessage = (event) => {
        const { type } = event.data;

        if (type === "reauth-success") {
          // 关闭 reauth 窗口（如果还开着）
          if (reauthWindowRef.current && !reauthWindowRef.current.closed) {
            reauthWindowRef.current.close();
          }
          onReauthSuccessRef.current();
        } else if (type === "reauth-cancelled") {
          onReauthCancelledRef.current();
        }
      };
    }

    return () => {
      // 清理 BroadcastChannel
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []); // 移除依赖项，只在组件挂载时创建一次

  // 打开 reauth 窗口
  const openReauthWindow = () => {
    const reauthWindow = window.open("/reauth", "reauth");
    reauthWindowRef.current = reauthWindow;
  };

  // 检查是否需要 reauth
  const needsReauth = (
    error: unknown,
  ): error is { code: string } | { error: { code: string } } => {
    if (!error || typeof error !== "object") return false;
    const err = error as Record<string, unknown>;
    return (
      err.code === "NEED_REAUTH" ||
      (typeof err.error === "object" &&
        err.error !== null &&
        (err.error as Record<string, unknown>).code === "NEED_REAUTH")
    );
  };

  // 设置待处理的操作
  const setPendingAction = (action: PendingAction | null) => {
    pendingActionRef.current = action;
  };

  // 获取待处理的操作
  const getPendingAction = () => {
    return pendingActionRef.current;
  };

  // 清除待处理的操作
  const clearPendingAction = () => {
    pendingActionRef.current = null;
  };

  // 重定向到 SSO 绑定页面
  const redirectToSSOBind = (provider: OAuthProvider) => {
    router.push(
      `/sso/${provider}/login?mode=bind&redirect_to=/settings${window.location.hash}`,
    );
  };

  return {
    openReauthWindow,
    needsReauth,
    setPendingAction,
    getPendingAction,
    clearPendingAction,
    redirectToSSOBind,
  };
};
