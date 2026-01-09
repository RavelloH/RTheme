"use client";

import React, { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  generatePasskeyAuthenticationOptions,
  verifyPasskeyForReauth,
} from "@/actions/passkey";
import { Button } from "@/ui/Button";
import { RiKey2Line } from "@remixicon/react";
import { useToast } from "@/ui/Toast";

export default function PasskeyReauthButton({
  disabled,
  size = "md",
  onSuccess,
}: {
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onSuccess?: () => void;
}) {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    async function checkSupport() {
      const ok = !!(window.PublicKeyCredential && navigator.credentials);
      if (!ok) {
        setSupported(false);
        return;
      }
      try {
        // 浏览器能力检测：平台验证器
        const available = await (
          window.PublicKeyCredential as unknown as {
            isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
          }
        ).isUserVerifyingPlatformAuthenticatorAvailable?.();
        setSupported(!!available);
      } catch {
        setSupported(true); // 保守显示
      }
    }
    if (typeof window !== "undefined") checkSupport();
  }, []);

  if (!supported) return null; // 不支持则隐藏

  const onClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      // 生成验证选项
      const optResp = await generatePasskeyAuthenticationOptions();
      if (!optResp.success) {
        toast.error(optResp.message || "通行密钥不可用");
        setLoading(false);
        return;
      }

      const { nonce, options } = optResp.data!;

      // 启动 WebAuthn 验证流程
      const assertion = await startAuthentication({ optionsJSON: options });

      // 验证响应并直接设置 REAUTH_TOKEN（安全修复）
      const verifyResp = await verifyPasskeyForReauth({
        nonce,
        response: assertion,
      });
      if (!verifyResp.success) {
        toast.error(verifyResp.message || "验证失败");
        setLoading(false);
        return;
      }

      toast.success("身份验证成功");

      // 通知父窗口验证成功
      if (onSuccess) {
        onSuccess();
      }

      // 延迟关闭窗口
      setTimeout(() => {
        window.close();
      }, 500);
    } catch (e) {
      console.error(e);
      toast.error("通行密钥验证失败，请重试");
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={onClick}
        label="使用通行密钥验证"
        icon={<RiKey2Line size={"1.5em"} />}
        variant="secondary"
        size={size}
        fullWidth
        disabled={loading || disabled}
        loading={loading}
        loadingText="验证中..."
      />
    </div>
  );
}
