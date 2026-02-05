"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { changePassword } from "@/actions/auth";
import { setPassword } from "@/actions/sso";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { useToast } from "@/ui/Toast";

interface PasswordDialogsProps {
  onPasswordSet: () => void;
  onNeedReauth: (
    action:
      | {
          type: "setPassword";
          data: { newPassword: string };
        }
      | {
          type: "changePassword";
          data: { new_password: string };
        },
  ) => void;
}

/**
 * 密码设置和修改对话框组件
 */
export interface PasswordDialogsRef {
  openSetPasswordDialog: () => void;
  openChangePasswordDialog: () => void;
  executeSetPassword: (data: { newPassword: string }) => Promise<void>;
  executeChangePassword: (data: { new_password: string }) => Promise<void>;
}

export const PasswordDialogs = React.forwardRef<
  PasswordDialogsRef,
  PasswordDialogsProps
>(({ onPasswordSet, onNeedReauth }, ref) => {
  const router = useRouter();
  const toast = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    openSetPasswordDialog: () => setShowSetPasswordDialog(true),
    openChangePasswordDialog: () => setShowPasswordDialog(true),
    executeSetPassword,
    executeChangePassword,
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

  // 执行设置密码
  const executeSetPassword = async (data: { newPassword: string }) => {
    setPasswordLoading(true);
    try {
      const result = await setPassword(data);

      if (result.success) {
        toast.success(result.message);
        setShowSetPasswordDialog(false);
        setNewPassword("");
        setConfirmPassword("");
        onPasswordSet();
        setPasswordLoading(false);
      } else if (needsReauth(result.error)) {
        onNeedReauth({ type: "setPassword", data });
      } else {
        toast.error(result.message);
        setPasswordLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "设置密码失败");
      setPasswordLoading(false);
    }
  };

  // 执行修改密码
  const executeChangePassword = async (data: { new_password: string }) => {
    setPasswordLoading(true);
    try {
      const result = await changePassword({
        old_password: "",
        new_password: data.new_password,
      });

      if (result.success) {
        toast.success("密码修改成功，请重新登录");
        setShowPasswordDialog(false);
        setNewPassword("");
        setConfirmPassword("");

        // 清空 localStorage 中的用户信息
        if (typeof window !== "undefined") {
          localStorage.removeItem("user_info");
          window.dispatchEvent(
            new CustomEvent("localStorageUpdate", {
              detail: { key: "user_info" },
            }),
          );
        }

        // 延迟跳转到登录页
        setTimeout(() => {
          router.push("/login?message=密码已修改，请使用新密码登录");
        }, 1000);
      } else if (needsReauth(result.error)) {
        onNeedReauth({ type: "changePassword", data });
      } else {
        toast.error(result.message);
        setPasswordLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "修改密码失败");
      setPasswordLoading(false);
    }
  };

  // 处理设置密码
  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("密码长度至少为 8 位");
      return;
    }

    await executeSetPassword({ newPassword });
  };

  // 处理修改密码
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("密码长度至少为 8 位");
      return;
    }

    await executeChangePassword({
      new_password: newPassword,
    });
  };

  return (
    <>
      {/* 修改密码对话框 */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setNewPassword("");
          setConfirmPassword("");
        }}
        title="修改密码"
        size="sm"
      >
        <div className="px-6 py-6 space-y-8">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                设置新密码
              </h3>
              <p className="text-sm text-muted-foreground">
                为保障安全，在修改密码前需要验证你的身份
              </p>
            </div>
            <div className="space-y-4">
              <Input
                label="新密码"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                size="sm"
                helperText="至少 8 位字符"
              />
              <Input
                label="确认新密码"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                size="sm"
                helperText="再次输入新密码"
              />
            </div>
          </section>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => {
                setShowPasswordDialog(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              size="sm"
              disabled={passwordLoading}
            />
            <Button
              label="确认修改"
              variant="secondary"
              onClick={handleChangePassword}
              loading={passwordLoading}
              size="sm"
            />
          </div>
        </div>
      </Dialog>

      {/* 设置密码对话框 */}
      <Dialog
        open={showSetPasswordDialog}
        onClose={() => {
          setShowSetPasswordDialog(false);
          setNewPassword("");
          setConfirmPassword("");
        }}
        title="设置密码"
        size="sm"
      >
        <div className="px-6 py-6 space-y-8">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                创建密码
              </h3>
              <p className="text-sm text-muted-foreground">
                设置密码后可以使用邮箱和密码登录
              </p>
            </div>
            <div className="space-y-4">
              <Input
                label="新密码"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                size="sm"
                helperText="至少 8 位字符"
              />
              <Input
                label="确认密码"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                size="sm"
                helperText="再次输入密码"
              />
            </div>
          </section>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => {
                setShowSetPasswordDialog(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              size="sm"
              disabled={passwordLoading}
            />
            <Button
              label="确认设置"
              variant="secondary"
              onClick={handleSetPassword}
              loading={passwordLoading}
              size="sm"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
});

PasswordDialogs.displayName = "PasswordDialogs";
