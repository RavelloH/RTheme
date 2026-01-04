"use client";

import React, { useState } from "react";
import { AlertDialog } from "@/ui/AlertDialog";
import { useToast } from "@/ui/Toast";
import { revokeSession } from "@/actions/auth";

interface SessionDialogsProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRevokeSuccess: () => void;
  onNeedReauth: (action: {
    type: "revokeSession";
    data: { sessionId: string };
  }) => void;
}

export interface SessionDialogsRef {
  executeRevokeSession: (data: { sessionId: string }) => Promise<void>;
}

/**
 * 会话撤销对话框组件
 */
export const SessionDialogs = React.forwardRef<
  SessionDialogsRef,
  SessionDialogsProps
>(({ sessionId, isOpen, onClose, onRevokeSuccess, onNeedReauth }, ref) => {
  const toast = useToast();
  const [revokeSessionLoading, setRevokeSessionLoading] = useState(false);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    executeRevokeSession,
  }));

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

  // 执行撤销会话
  const executeRevokeSession = async (data: { sessionId: string }) => {
    setRevokeSessionLoading(true);
    try {
      const result = await revokeSession(data);

      if (result.success) {
        toast.success(result.message);
        onClose();
        onRevokeSuccess();
        setRevokeSessionLoading(false);
      } else if (needsReauth(result.error)) {
        onNeedReauth({ type: "revokeSession", data });
      } else {
        toast.error(result.message);
        setRevokeSessionLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤销会话失败");
      setRevokeSessionLoading(false);
    }
  };

  // 处理撤销会话
  const handleRevokeSession = async () => {
    if (!sessionId) {
      toast.error("未选择要撤销的会话");
      return;
    }

    await executeRevokeSession({ sessionId });
  };

  return (
    <AlertDialog
      open={isOpen}
      onClose={onClose}
      onConfirm={handleRevokeSession}
      title="撤销会话"
      description="撤销后该设备将无法继续使用此会话访问你的账户。为保障安全，在执行操作前需要验证你的身份。"
      confirmText="确认撤销"
      cancelText="取消"
      variant="danger"
      loading={revokeSessionLoading}
    />
  );
});

SessionDialogs.displayName = "SessionDialogs";
