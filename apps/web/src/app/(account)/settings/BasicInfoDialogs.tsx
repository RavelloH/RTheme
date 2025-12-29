"use client";

import React, { useState } from "react";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { useToast } from "@/ui/Toast";
import { updateUserProfile } from "@/actions/user";
import { useRouter } from "next/navigation";

type EditableField = "nickname" | "username" | "email" | "website" | "bio";

interface FieldConfig {
  title: string;
  label: string;
  placeholder: string;
  inputType: "input" | "textarea";
  helperText: string;
  maxLength?: number;
  requiresReauth: boolean;
  securityWarning?: string;
}

const fieldConfig: Record<EditableField, FieldConfig> = {
  nickname: {
    title: "修改昵称",
    label: "昵称",
    placeholder: "请输入昵称（2-20字符）",
    inputType: "input",
    helperText: "你的显示名称",
    maxLength: 20,
    requiresReauth: false,
  },
  username: {
    title: "修改用户名",
    label: "用户名",
    placeholder: "请输入用户名（3-20字符）",
    inputType: "input",
    helperText: "只能以小写字母开头，包含小写字母、数字和下划线",
    maxLength: 20,
    requiresReauth: true,
    securityWarning: "修改用户名需要验证身份，完成后将退出登录",
  },
  email: {
    title: "修改邮箱",
    label: "邮箱",
    placeholder: "请输入新邮箱地址",
    inputType: "input",
    helperText: "用于接收通知和账户恢复",
    requiresReauth: true,
    securityWarning:
      "修改邮箱需要验证身份，完成后将退出登录。你可能需要重新验证新邮箱地址，才能再次登录。",
  },
  website: {
    title: "修改网站",
    label: "网站",
    placeholder: "请输入网站 URL（如 https://example.com）",
    inputType: "input",
    helperText: "你的个人网站或社交链接",
    maxLength: 255,
    requiresReauth: false,
  },
  bio: {
    title: "修改个人简介",
    label: "个人简介",
    placeholder: "请输入个人简介",
    inputType: "textarea",
    helperText: "最多 255 字符",
    maxLength: 255,
    requiresReauth: false,
  },
};

interface BasicInfoDialogsProps {
  onFieldUpdated: () => void;
  onNeedReauth: (action: {
    type: "updateProfile";
    data: { field: string; value: string };
  }) => void;
}

export interface BasicInfoDialogsRef {
  openEditDialog: (field: EditableField, currentValue: string) => void;
  executeUpdate: (data: { field: string; value: string }) => Promise<void>;
}

export const BasicInfoDialogs = React.forwardRef<
  BasicInfoDialogsRef,
  BasicInfoDialogsProps
>(({ onFieldUpdated, onNeedReauth }, ref) => {
  const router = useRouter();
  const toast = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [currentField, setCurrentField] = useState<EditableField | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    openEditDialog: (field: EditableField, currentValue: string) => {
      setCurrentField(field);
      setValue(currentValue || "");
      setShowDialog(true);
    },
    executeUpdate,
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

  // 执行更新
  const executeUpdate = async (data: { field: string; value: string }) => {
    setLoading(true);
    try {
      const result = await updateUserProfile({
        field: data.field as EditableField,
        value: data.value,
      });

      if (result.success && result.data) {
        const { needsLogout } = result.data;

        if (needsLogout) {
          toast.success("修改成功，请重新登录");
          setShowDialog(false);
          setValue("");
          setCurrentField(null);

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
            const message = encodeURIComponent(
              `${fieldConfig[data.field as EditableField]?.label}已修改，请使用新信息登录`,
            );
            router.push(`/login?message=${message}`);
          }, 1000);
        } else {
          toast.success(result.message || "修改成功");
          setShowDialog(false);
          setValue("");
          setCurrentField(null);
          onFieldUpdated();
        }
        setLoading(false);
      } else if (needsReauth(result.error)) {
        onNeedReauth({ type: "updateProfile", data });
        setLoading(false);
      } else {
        toast.error(result.message || "修改失败");
        setLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "修改失败");
      setLoading(false);
    }
  };

  // 处理提交
  const handleSubmit = async () => {
    if (!currentField) return;

    const config = fieldConfig[currentField];
    const trimmedValue = value.trim();

    // 基本验证
    if (
      !trimmedValue &&
      currentField !== "nickname" &&
      currentField !== "website" &&
      currentField !== "bio"
    ) {
      toast.error(`请输入${config.label}`);
      return;
    }

    // 长度验证
    if (config.maxLength && trimmedValue.length > config.maxLength) {
      toast.error(`${config.label}不能超过${config.maxLength}个字符`);
      return;
    }

    // 昵称验证
    if (
      currentField === "nickname" &&
      trimmedValue &&
      trimmedValue.length < 2
    ) {
      toast.error("昵称至少需要2个字符");
      return;
    }

    // 用户名验证
    if (currentField === "username") {
      if (trimmedValue.length < 3) {
        toast.error("用户名至少需要3个字符");
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(trimmedValue)) {
        toast.error("用户名只能以小写字母开头，只能包含小写字母、数字和下划线");
        return;
      }
    }

    // 邮箱验证
    if (currentField === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedValue)) {
        toast.error("请输入有效的邮箱地址");
        return;
      }
    }

    await executeUpdate({ field: currentField, value: trimmedValue });
  };

  const handleClose = () => {
    setShowDialog(false);
    setValue("");
    setCurrentField(null);
  };

  // 获取当前字段配置，如果没有则使用 nickname 作为默认值（不会显示）
  const config = currentField
    ? fieldConfig[currentField]
    : fieldConfig.nickname;

  return (
    <Dialog
      open={showDialog && currentField !== null}
      onClose={handleClose}
      title={config.title}
      size="sm"
    >
      <div className="px-6 py-6 space-y-8">
        <section className="space-y-4">
          {config.securityWarning && (
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {config.securityWarning}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label={config.label}
              type={currentField === "email" ? "email" : "text"}
              value={value}
              onChange={(e) => {
                const newValue = e.target.value;
                if (!config.maxLength || newValue.length <= config.maxLength) {
                  setValue(newValue);
                }
              }}
              size="sm"
              helperText={config.helperText}
              maxLength={config.maxLength}
              rows={config.inputType === "textarea" ? 5 : undefined}
              tips={
                config.maxLength
                  ? `${value.length}/${config.maxLength}`
                  : undefined
              }
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
          <Button
            label="取消"
            variant="ghost"
            onClick={handleClose}
            size="sm"
            disabled={loading}
          />
          <Button
            label="确认修改"
            variant="secondary"
            onClick={handleSubmit}
            loading={loading}
            loadingText="修改中..."
            size="sm"
          />
        </div>
      </div>
    </Dialog>
  );
});

BasicInfoDialogs.displayName = "BasicInfoDialogs";
