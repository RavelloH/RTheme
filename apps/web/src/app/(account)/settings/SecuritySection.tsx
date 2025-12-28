"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/ui/Button";
import type { OAuthProvider } from "@/lib/server/oauth";
import { getProviderName, getProviderIcon } from "./settingsHelpers";
import PasskeyManager from "./PasskeyManager";
import { getTotpStatus } from "@/actions/totp";
import { TotpDialogs, type TotpDialogsRef } from "./TotpDialogs";
import type { PendingAction } from "./useReauth";
import { AutoTransition } from "@/ui/AutoTransition";
import { AutoResizer } from "@/ui/AutoResizer";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

interface LinkedAccount {
  provider: string;
  email: string;
}

interface UserProfile {
  hasPassword: boolean;
  linkedAccounts: LinkedAccount[];
}

interface SecuritySectionProps {
  user: UserProfile;
  enabledSSOProviders: OAuthProvider[];
  passkeyEnabled: boolean;
  onPasswordAction: (action: "set" | "change") => void;
  onLinkSSO: (provider: OAuthProvider) => void;
  onUnlinkSSO: (provider: OAuthProvider) => void;
  onNeedReauth: (action: PendingAction) => void;
  totpDialogsRef?: React.RefObject<TotpDialogsRef | null>;
}

/**
 * 安全设置板块组件
 */
export const SecuritySection: React.FC<SecuritySectionProps> = ({
  user,
  enabledSSOProviders,
  passkeyEnabled,
  onPasswordAction,
  onLinkSSO,
  onUnlinkSSO,
  onNeedReauth,
  totpDialogsRef: externalTotpDialogsRef,
}) => {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpBackupCodesRemaining, setTotpBackupCodesRemaining] = useState(0);
  const [totpLoading, setTotpLoading] = useState(true);
  const internalTotpDialogsRef = useRef<TotpDialogsRef>(null);
  const totpDialogsRef = externalTotpDialogsRef || internalTotpDialogsRef;
  const hasLoadedRef = useRef(false);

  const linkedProviders = user.linkedAccounts.map((acc) =>
    acc.provider.toLowerCase(),
  );

  // 加载 TOTP 状态
  const loadTotpStatus = async () => {
    setTotpLoading(true);
    try {
      const result = await getTotpStatus();
      if (result.success && result.data) {
        setTotpEnabled(result.data.enabled);
        setTotpBackupCodesRemaining(result.data.backupCodesRemaining);
      }
    } catch (err) {
      console.error("Failed to load TOTP status:", err);
    } finally {
      setTotpLoading(false);
    }
  };

  // 初始加载 TOTP 状态（防止 React 严格模式下重复加载）
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadTotpStatus();
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
          安全设置
        </h2>
        <p className="text-muted-foreground text-sm">
          管理你的登录方式和账户安全
        </p>
      </div>

      {/* 密码设置 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            密码
          </h3>
        </div>
        <div className="p-6">
          {user.hasPassword ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">密码已设置</p>
                <p className="text-sm text-muted-foreground mt-1">
                  已启用密码登录
                </p>
              </div>
              <Button
                label="修改密码"
                onClick={() => onPasswordAction("change")}
                variant="secondary"
                size="sm"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">未设置密码</p>
                <p className="text-sm text-muted-foreground mt-1">
                  设置密码后可以使用密码登录
                </p>
              </div>
              <Button
                label="设置密码"
                onClick={() => onPasswordAction("set")}
                variant="secondary"
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* TOTP 两步验证管理 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            两步验证（TOTP）
          </h3>
        </div>
        <div className="p-6">
          <AutoResizer duration={0.3}>
            <div>
              <AutoTransition type="fade" duration={0.2} initial={false}>
                {totpLoading ? (
                  <div
                    key="loading"
                    className="flex items-center justify-center py-12"
                  >
                    <LoadingIndicator size="md" />
                  </div>
                ) : totpEnabled ? (
                  <div key="enabled" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">
                          两步验证已启用
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          登录时需要输入验证码
                        </p>
                      </div>
                      <Button
                        label="禁用"
                        onClick={() =>
                          totpDialogsRef.current?.openDisableDialog()
                        }
                        variant="danger"
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-foreground/10">
                      <div>
                        <p className="text-foreground font-medium">备份码</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          剩余 {totpBackupCodesRemaining} 个备份码
                        </p>
                      </div>
                      <Button
                        label="重新生成"
                        onClick={() =>
                          totpDialogsRef.current?.openRegenerateDialog()
                        }
                        variant="secondary"
                        size="sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    key="disabled"
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-foreground font-medium">
                        未启用两步验证
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        为账户添加额外的安全保护
                      </p>
                    </div>
                    <Button
                      label="启用"
                      onClick={() => totpDialogsRef.current?.openEnableDialog()}
                      variant="secondary"
                      size="sm"
                    />
                  </div>
                )}
              </AutoTransition>
            </div>
          </AutoResizer>
        </div>
      </div>

      {/* TOTP 对话框 */}
      <TotpDialogs
        ref={totpDialogsRef}
        onTotpStatusChange={loadTotpStatus}
        onNeedReauth={onNeedReauth}
      />

      {/* SSO 账户管理 */}
      {enabledSSOProviders.length > 0 && (
        <div className="bg-background border border-foreground/10 rounded-sm">
          <div className="px-6 py-4 border-b border-foreground/10">
            <h3 className="text-lg font-medium text-foreground tracking-wider">
              SSO 登录方式
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {enabledSSOProviders.map((provider) => {
                const isLinked = linkedProviders.includes(provider);
                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between py-3 border-b border-foreground/10 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center">
                        {getProviderIcon(provider)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {getProviderName(provider)}
                        </p>
                        {isLinked ? (
                          <p className="text-sm text-muted-foreground">
                            已绑定 -{" "}
                            {
                              user.linkedAccounts.find(
                                (acc) =>
                                  acc.provider.toLowerCase() === provider,
                              )?.email
                            }
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            未绑定
                          </p>
                        )}
                      </div>
                    </div>
                    {isLinked ? (
                      <Button
                        label="解绑"
                        onClick={() => onUnlinkSSO(provider)}
                        variant="danger"
                        size="sm"
                      />
                    ) : (
                      <Button
                        label="绑定"
                        onClick={() => onLinkSSO(provider)}
                        variant="secondary"
                        size="sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 通行密钥管理 */}
      {passkeyEnabled && (
        <div className="bg-background border border-foreground/10 rounded-sm">
          <div className="px-6 py-4 border-b border-foreground/10">
            <h3 className="text-lg font-medium text-foreground tracking-wider">
              通行密钥管理
            </h3>
          </div>
          <div className="p-6">
            <PasskeyManager />
          </div>
        </div>
      )}
    </div>
  );
};
