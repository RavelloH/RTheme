/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { OtpInput } from "@/ui/OtpInput";
import { useToast } from "@/ui/Toast";
import {
  enableTotp,
  confirmTotp,
  disableTotp,
  regenerateBackupCodes,
} from "@/actions/totp";
import QRCode from "qrcode";

import type { PendingAction } from "./useReauth";

interface TotpDialogsProps {
  onTotpStatusChange: () => void;
  onNeedReauth: (action: PendingAction) => void;
}

export interface TotpDialogsRef {
  openEnableDialog: () => void;
  openDisableDialog: () => void;
  openRegenerateDialog: () => void;
  executeEnableTotp: () => Promise<void>;
  executeDisableTotp: () => Promise<void>;
  executeRegenerateBackupCodes: () => Promise<void>;
}

/**
 * TOTP 两步验证相关对话框组件
 */
export const TotpDialogs = React.forwardRef<TotpDialogsRef, TotpDialogsProps>(
  ({ onTotpStatusChange, onNeedReauth }, ref) => {
    const toast = useToast();

    // TOTP 设置相关状态
    const [showTotpSetupDialog, setShowTotpSetupDialog] = useState(false);
    const [showTotpDisableDialog, setShowTotpDisableDialog] = useState(false);
    const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
    const [totpSecret, setTotpSecret] = useState("");
    const [totpQrCodeUri, setTotpQrCodeUri] = useState("");
    const [totpSetupCode, setTotpSetupCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [backupCodesConfirmed, setBackupCodesConfirmed] = useState(false);
    const [totpLoading, setTotpLoading] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

    // 暴露方法给父组件
    React.useImperativeHandle(ref, () => ({
      openEnableDialog: () => handleEnableTotp(),
      openDisableDialog: () => setShowTotpDisableDialog(true),
      openRegenerateDialog: () => handleRegenerateBackupCodes(),
      executeEnableTotp: () => handleEnableTotp(),
      executeDisableTotp: () => handleDisableTotp(),
      executeRegenerateBackupCodes: () => handleRegenerateBackupCodes(),
    }));

    // 生成 QR 码图片
    useEffect(() => {
      if (totpQrCodeUri && showTotpSetupDialog) {
        QRCode.toDataURL(totpQrCodeUri, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        })
          .then((url: string) => setQrCodeDataUrl(url))
          .catch((err: Error) =>
            console.error("Failed to generate QR code:", err),
          );
      }
    }, [totpQrCodeUri, showTotpSetupDialog]);

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

    // 启用 TOTP - 第一步：生成 secret 和 QR code
    const handleEnableTotp = async () => {
      setTotpLoading(true);
      try {
        const result = await enableTotp();

        if (result.success && result.data) {
          setTotpSecret(result.data.secret);
          setTotpQrCodeUri(result.data.qrCodeUri);
          setShowTotpSetupDialog(true);
          setTotpLoading(false);
        } else if (needsReauth(result.error)) {
          setTotpLoading(false);
          onNeedReauth({ type: "enableTotp", data: {} });
        } else {
          toast.error(result.message);
          setTotpLoading(false);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "启用失败");
        setTotpLoading(false);
      }
    };

    // 确认 TOTP 设置 - 第二步：验证 TOTP 码并获取备份码
    const handleConfirmTotp = async () => {
      if (!totpSetupCode || totpSetupCode.length !== 6) {
        toast.error("请输入 6 位验证码");
        return;
      }

      setTotpLoading(true);
      try {
        const result = await confirmTotp({ totp_code: totpSetupCode });

        if (result.success && result.data) {
          toast.success("TOTP 启用成功");
          setBackupCodes(result.data.backupCodes);
          setShowTotpSetupDialog(false);
          setShowBackupCodesDialog(true);
          setTotpSetupCode("");
          setBackupCodesConfirmed(false);
          onTotpStatusChange();
          setTotpLoading(false);
        } else {
          toast.error(result.message);
          setTotpLoading(false);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "确认失败");
        setTotpLoading(false);
      }
    };

    // 禁用 TOTP
    const handleDisableTotp = async () => {
      setTotpLoading(true);
      try {
        const result = await disableTotp();

        if (result.success) {
          toast.success(result.message);
          setShowTotpDisableDialog(false);
          onTotpStatusChange();
          setTotpLoading(false);
        } else if (needsReauth(result.error)) {
          setTotpLoading(false);
          onNeedReauth({ type: "disableTotp", data: {} });
        } else {
          toast.error(result.message);
          setTotpLoading(false);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "禁用失败");
        setTotpLoading(false);
      }
    };

    // 重新生成备份码
    const handleRegenerateBackupCodes = async () => {
      setTotpLoading(true);
      try {
        const result = await regenerateBackupCodes();

        if (result.success && result.data) {
          toast.success(result.message);
          setBackupCodes(result.data.backupCodes);
          setShowBackupCodesDialog(true);
          setBackupCodesConfirmed(false);
          onTotpStatusChange();
          setTotpLoading(false);
        } else if (needsReauth(result.error)) {
          setTotpLoading(false);
          onNeedReauth({ type: "regenerateBackupCodes", data: {} });
        } else {
          toast.error(result.message);
          setTotpLoading(false);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "重新生成失败");
        setTotpLoading(false);
      }
    };

    return (
      <>
        {/* TOTP 设置对话框 */}
        <Dialog
          open={showTotpSetupDialog}
          onClose={() => {
            if (!totpLoading) {
              setShowTotpSetupDialog(false);
              setTotpSetupCode("");
              setTotpSecret("");
              setTotpQrCodeUri("");
            }
          }}
          title="启用两步验证"
          size="md"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  扫描二维码
                </h3>
                <p className="text-sm text-muted-foreground">
                  使用验证器应用（如 Google Authenticator、Microsoft
                  Authenticator）扫描下方二维码
                </p>
              </div>

              {qrCodeDataUrl && (
                <div className="flex justify-center">
                  <img
                    src={qrCodeDataUrl}
                    alt="TOTP QR Code"
                    className="w-64 h-64"
                  />
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  或手动输入以下密钥:
                </p>
                <div className="p-3 bg-foreground/5 rounded-sm">
                  <code className="text-sm font-mono text-foreground break-all">
                    {totpSecret}
                  </code>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  验证设置
                </h3>
                <p className="text-sm text-muted-foreground">
                  请输入验证器应用生成的 6 位验证码
                </p>
              </div>

              <div className="flex justify-center">
                <OtpInput
                  length={6}
                  value={totpSetupCode}
                  onChange={setTotpSetupCode}
                  disabled={totpLoading}
                  onComplete={() => {}}
                />
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => {
                  setShowTotpSetupDialog(false);
                  setTotpSetupCode("");
                  setTotpSecret("");
                  setTotpQrCodeUri("");
                }}
                size="sm"
                disabled={totpLoading}
              />
              <Button
                label="确认启用"
                variant="secondary"
                onClick={handleConfirmTotp}
                loading={totpLoading}
                loadingText="验证中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>

        {/* TOTP 禁用对话框 */}
        <Dialog
          open={showTotpDisableDialog}
          onClose={() => {
            if (!totpLoading) {
              setShowTotpDisableDialog(false);
            }
          }}
          title="禁用两步验证"
          size="sm"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  确认禁用
                </h3>
                <p className="text-sm text-muted-foreground">
                  禁用后将降低账户安全性。为保障安全，在执行操作前需要验证你的身份。
                </p>
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => setShowTotpDisableDialog(false)}
                size="sm"
                disabled={totpLoading}
              />
              <Button
                label="确认禁用"
                variant="danger"
                onClick={handleDisableTotp}
                loading={totpLoading}
                loadingText="禁用中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>

        {/* 备份码展示对话框 */}
        <Dialog
          open={showBackupCodesDialog}
          onClose={() => {
            if (backupCodesConfirmed) {
              setShowBackupCodesDialog(false);
              setBackupCodes([]);
              setBackupCodesConfirmed(false);
            }
          }}
          title="备份码"
          size="md"
        >
          <div className="px-6 py-6 space-y-6">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground tracking-wider">
                  保存备份码
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  每个备份码只能使用一次。请将这些备份码保存在安全的地方。
                  <span className="font-bold text-white">
                    这些代码只会显示一次。
                  </span>
                </p>
              </div>

              {/* 备份码网格 */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-foreground/5 rounded-sm border border-foreground/10">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="font-mono text-base text-foreground text-center py-3 px-2 bg-background rounded-sm border border-foreground/10 tracking-wider"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </section>

            {/* 确认区域 */}
            <section className="space-y-4 pt-2">
              <Checkbox
                label="我已安全保存这些备份码"
                checked={backupCodesConfirmed}
                onChange={(e) => setBackupCodesConfirmed(e.target.checked)}
                size="md"
              />

              <Button
                label="确认"
                variant="secondary"
                onClick={() => {
                  setShowBackupCodesDialog(false);
                  setBackupCodes([]);
                  setBackupCodesConfirmed(false);
                }}
                size="md"
                disabled={!backupCodesConfirmed}
                fullWidth
              />
            </section>
          </div>
        </Dialog>
      </>
    );
  },
);

TotpDialogs.displayName = "TotpDialogs";
