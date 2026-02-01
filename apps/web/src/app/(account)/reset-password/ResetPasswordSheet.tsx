"use client";

import { useEffect, useState } from "react";
import { RiLockPasswordLine, RiMailLine } from "@remixicon/react";
import { useSearchParams } from "next/navigation";

import {
  requestPasswordReset as requestPasswordResetAction,
  resetPassword as resetPasswordAction,
} from "@/actions/auth";
import { CaptchaButton } from "@/components/ui/CaptchaButton";
import Link, { useNavigateWithTransition } from "@/components/ui/Link";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";

export default function ResetPasswordSheet() {
  const navigate = useNavigateWithTransition();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") || "";
  const reasonFromUrl = searchParams.get("reason") || "";
  const { broadcast } = useBroadcastSender<{ type: string }>();

  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTip, setPasswordTip] = useState("");

  // 提示对话框状态
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  // 检测 reason 参数并显示对话框
  useEffect(() => {
    if (reasonFromUrl === "NEEDS_UPDATE") {
      setShowReasonDialog(true);
    }
  }, [reasonFromUrl]);

  // 请求重置按钮状态
  const [requestButtonLabel, setRequestButtonLabel] = useState("发送重置链接");
  const [requestButtonVariant, setRequestButtonVariant] = useState<
    "secondary" | "outline"
  >("secondary");
  const [requestButtonLoading, setRequestButtonLoading] = useState(false);
  const [requestButtonLoadingText, setRequestButtonLoadingText] =
    useState("发送中");

  // 重置密码按钮状态
  const [resetButtonLabel, setResetButtonLabel] = useState("重置密码");
  const [resetButtonVariant, setResetButtonVariant] = useState<
    "secondary" | "outline"
  >("secondary");
  const [resetButtonLoading, setResetButtonLoading] = useState(false);
  const [resetButtonLoadingText, setResetButtonLoadingText] =
    useState("重置中");

  useBroadcast((message: { type: string; token: string }) => {
    if (message?.type === "captcha-solved") {
      setToken(message.token);
    }
  });

  useBroadcast((message: { type: string; token: string }) => {
    if (message?.type === "captcha-error") {
      if (codeFromUrl) {
        setResetButtonLabel("安全验证失败，请刷新页面重试");
        setResetButtonVariant("outline");
      } else {
        setRequestButtonLabel("安全验证失败，请刷新页面重试");
        setRequestButtonVariant("outline");
      }
    }
  });

  // 密码验证逻辑
  const validatePassword = (password: string, confirm: string) => {
    if (password === "" && confirm === "") {
      setPasswordTip("");
      return true;
    }

    if (password.length < 6) {
      setPasswordTip(" (密码至少6位)");
      return false;
    }

    if (password.length > 100) {
      setPasswordTip(" (密码最多100位)");
      return false;
    }

    if (confirm && password !== confirm) {
      setPasswordTip(" (两次密码不一致)");
      return false;
    }

    setPasswordTip("");
    return true;
  };

  const showMessage = (
    msg: string,
    setter: (label: string) => void,
    variantSetter: (variant: "secondary" | "outline") => void,
  ) => {
    setter(msg);
    variantSetter("outline");
    setTimeout(() => {
      setter(codeFromUrl ? "重置密码" : "发送重置链接");
      variantSetter("secondary");
    }, 2000);
  };

  // 请求重置密码
  const requestReset = async () => {
    if (requestButtonVariant !== "secondary") return;
    if (!token) {
      showMessage(
        "安全验证失败，请刷新页面重试",
        setRequestButtonLabel,
        setRequestButtonVariant,
      );
      return;
    }
    if (!email) {
      showMessage(
        "请输入邮箱地址",
        setRequestButtonLabel,
        setRequestButtonVariant,
      );
      return;
    }

    setRequestButtonLoading(true);
    setRequestButtonLoadingText("发送中");
    setRequestButtonVariant("outline");

    const result = await requestPasswordResetAction({
      email,
      captcha_token: token,
    });

    const responseData =
      result instanceof Response ? await result.json() : result;

    if (responseData.success) {
      setRequestButtonLoadingText("重置链接已发送，请检查邮箱");
      // 成功发送后不重置按钮状态，保持加载状态
    } else {
      setRequestButtonLoadingText(
        responseData.message || "发送失败，请稍后重试",
      );
      // 失败时才重置按钮状态和验证码
      setTimeout(() => {
        setRequestButtonLoading(false);
        setRequestButtonVariant("secondary");
        setRequestButtonLabel("发送重置链接");
        broadcast({ type: "captcha-reset" });
      }, 2000);
    }
  };

  // 重置密码
  const resetPassword = async () => {
    if (resetButtonVariant !== "secondary") return;
    if (!token) {
      showMessage(
        "安全验证失败，请刷新页面重试",
        setResetButtonLabel,
        setResetButtonVariant,
      );
      return;
    }
    if (!newPassword || !confirmPassword) {
      showMessage("请填写所有字段", setResetButtonLabel, setResetButtonVariant);
      return;
    }
    if (!validatePassword(newPassword, confirmPassword)) {
      showMessage("密码格式不正确", setResetButtonLabel, setResetButtonVariant);
      return;
    }

    setResetButtonLoading(true);
    setResetButtonLoadingText("重置中");
    setResetButtonVariant("outline");

    const result = await resetPasswordAction({
      code: codeFromUrl,
      new_password: newPassword,
      captcha_token: token,
    });

    const responseData =
      result instanceof Response ? await result.json() : result;

    if (responseData.success) {
      setResetButtonLoadingText("密码重置成功，正在跳转...");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } else {
      setResetButtonLoadingText(responseData.message || "重置失败，请稍后重试");
      setTimeout(() => {
        setResetButtonLoading(false);
        setResetButtonVariant("secondary");
        setResetButtonLabel("重置密码");
        broadcast({ type: "captcha-reset" });
      }, 2000);
    }
  };

  // 处理回车键提交
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (codeFromUrl && !resetButtonLoading) {
        resetPassword();
      } else if (!codeFromUrl && !requestButtonLoading) {
        requestReset();
      }
    }
  };

  // 如果有 code 参数，显示重置密码表单
  if (codeFromUrl) {
    return (
      <>
        <Input
          label="New Password / 新密码"
          type="password"
          tips={passwordTip}
          disabled={resetButtonLoading}
          helperText="密码长度为6-100位"
          icon={<RiLockPasswordLine size={"1em"} />}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            validatePassword(e.target.value, confirmPassword);
          }}
          onKeyPress={handleKeyPress}
        />
        <Input
          label="Confirm Password / 确认密码"
          type="password"
          tips={passwordTip}
          disabled={resetButtonLoading}
          helperText="再次输入新密码"
          icon={<RiLockPasswordLine size={"1em"} />}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            validatePassword(newPassword, e.target.value);
          }}
          onKeyPress={handleKeyPress}
        />
        <hr />
        <div className="pt-10 w-full flex flex-col gap-4">
          <CaptchaButton
            label={resetButtonLabel}
            variant={resetButtonVariant}
            size="lg"
            fullWidth
            loadingText={resetButtonLoadingText}
            onClick={resetPassword}
            loading={resetButtonLoading}
          />
        </div>
        <div className="pt-3 w-full flex justify-center">
          <div className="text-sm text-muted-foreground">
            记起密码了？
            <Link
              href="/login"
              className="hover:text-primary"
              presets={["hover-underline", "hover-color"]}
            >
              立即登录{">"}
            </Link>
          </div>
        </div>
      </>
    );
  }

  // 默认显示请求重置表单
  return (
    <>
      {/* 安全策略更新提示对话框 - 没有 code 时显示 */}
      <Dialog
        open={showReasonDialog}
        onClose={() => {}}
        title="安全策略更新通知"
        dismissable={false}
        showCloseButton={false}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="text-foreground">
            <p className="mb-4">尊敬的用户，您好：</p>
            <p className="mb-4">
              由于站点安全策略已更新，密码加密方式已改变，您需要重置密码后方可继续使用。
            </p>
            <p className="mb-4">
              密码重置链接已发送至您注册时使用的邮箱，请查收邮件并点击链接完成密码重置。
            </p>
          </div>
        </div>
      </Dialog>

      <Input
        label="Email / 邮箱"
        disabled={requestButtonLoading}
        helperText="注册时使用的邮箱地址"
        icon={<RiMailLine size={"1em"} />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <hr />
      <div className="pt-10 w-full flex flex-col gap-4">
        <CaptchaButton
          label={requestButtonLabel}
          variant={requestButtonVariant}
          size="lg"
          fullWidth
          loadingText={requestButtonLoadingText}
          onClick={requestReset}
          loading={requestButtonLoading}
        />
      </div>
      <div className="pt-3 w-full flex justify-between">
        <div className="text-sm text-muted-foreground">
          记起密码了？
          <Link
            href="/login"
            className="hover:text-primary"
            presets={["hover-underline", "hover-color"]}
          >
            立即登录{">"}
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          <Link
            href="/register"
            className="hover:text-primary"
            presets={["hover-underline", "hover-color"]}
          >
            创建账户
          </Link>
        </div>
      </div>
    </>
  );
}
