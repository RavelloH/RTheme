"use client";

import React, { useState } from "react";
import { AlertDialog } from "@/ui/AlertDialog";
import { useToast } from "@/ui/Toast";
import { unlinkSSO } from "@/actions/sso";
import type { OAuthProvider } from "@/lib/server/oauth";
import { getProviderName } from "./settingsHelpers";

interface SSODialogsProps {
  provider: OAuthProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onUnlinkSuccess: () => void;
  onNeedReauth: (action: {
    type: "unlink";
    data: { provider: OAuthProvider };
  }) => void;
}

export interface SSODialogsRef {
  executeUnlinkSSO: (data: { provider: OAuthProvider }) => Promise<void>;
}

/**
 * SSO 解绑对话框组件
 */
export const SSODialogs = React.forwardRef<SSODialogsRef, SSODialogsProps>(
  ({ provider, isOpen, onClose, onUnlinkSuccess, onNeedReauth }, ref) => {
    const toast = useToast();
    const [unlinkLoading, setUnlinkLoading] = useState(false);

    // 暴露方法给父组件
    React.useImperativeHandle(ref, () => ({
      executeUnlinkSSO,
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

    // 执行解绑 SSO
    const executeUnlinkSSO = async (data: { provider: OAuthProvider }) => {
      setUnlinkLoading(true);
      try {
        const result = await unlinkSSO(data);

        if (result.success) {
          toast.success(result.message);
          onClose();
          onUnlinkSuccess();
        } else if (needsReauth(result.error)) {
          onNeedReauth({ type: "unlink", data });
        } else {
          toast.error(result.message);
          setUnlinkLoading(false);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "解绑失败");
        setUnlinkLoading(false);
      }
    };

    // 处理解绑 SSO
    const handleUnlinkSSO = async () => {
      if (!provider) {
        toast.error("未选择解绑的提供商");
        return;
      }

      await executeUnlinkSSO({ provider });
    };

    return (
      <AlertDialog
        open={isOpen}
        onClose={onClose}
        onConfirm={handleUnlinkSSO}
        title={`解绑 ${provider ? getProviderName(provider) : ""}`}
        description="解绑后将无法使用此方式登录。为保障安全，在执行操作前需要验证你的身份。"
        confirmText="确认解绑"
        cancelText="取消"
        variant="danger"
        loading={unlinkLoading}
      />
    );
  },
);

SSODialogs.displayName = "SSODialogs";
