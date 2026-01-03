"use client";

import React, { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "@/actions/passkey";
import { Button } from "@/ui/Button";
import { RiKey2Line } from "@remixicon/react";
import { useToast } from "@/ui/Toast";
import { useSearchParams } from "next/navigation";
import { useNavigateWithTransition } from "@/components/Link";

export default function PasskeyLoginButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();
  const navigate = useNavigateWithTransition();

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
      const optResp = await generatePasskeyAuthenticationOptions();
      if (!optResp.success) {
        toast.error(optResp.message || "通行密钥不可用");
        setLoading(false);
        return;
      }
      const { nonce, options } = optResp.data!;
      const assertion = await startAuthentication({ optionsJSON: options });
      const verifyResp = await verifyPasskeyAuthentication({
        nonce,
        response: assertion,
      });
      if (!verifyResp.success) {
        toast.error(verifyResp.message || "登录失败");
        setLoading(false);
        return;
      }
      const userInfo = {
        lastRefresh: new Date(),
        ...verifyResp.data!.userInfo,
      };
      localStorage.setItem("user_info", JSON.stringify(userInfo));
      window.dispatchEvent(
        new CustomEvent("localStorageUpdate", { detail: { key: "user_info" } }),
      );

      const redirectParam = searchParams.get("redirect");
      const targetPath = redirectParam
        ? redirectParam
        : "/user/" + userInfo.uid;
      toast.success("登录成功，正在跳转...");
      setTimeout(() => {
        navigate(targetPath);
      }, 1000);
    } catch (e) {
      console.error(e);
      toast.error("通行密钥登录失败，请重试");
      setLoading(false);
    }
  };

  return (
    <div className="py-3">
      <Button
        onClick={onClick}
        label="使用通行密钥登录"
        icon={<RiKey2Line size={"1.5em"} />}
        variant="secondary"
        size="lg"
        fullWidth
        disabled={loading || disabled}
      />
    </div>
  );
}
