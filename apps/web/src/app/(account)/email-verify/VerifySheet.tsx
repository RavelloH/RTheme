"use client";

import { Input } from "@/ui/Input";
import { RiMailLine, RiShieldKeyholeLine } from "@remixicon/react";
import { CaptchaButton } from "@/components/CaptchaButton";
import { useState } from "react";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";
import {
  verifyEmail as verifyEmailAction,
  resendEmailVerification as resendEmailAction,
} from "@/actions/auth";
import { useSearchParams } from "next/navigation";
import Link, { useNavigateWithTransition } from "@/components/Link";
import { Dialog } from "@/ui/Dialog";
import Clickable from "@/ui/Clickable";

export default function VerifySheet() {
  const navigate = useNavigateWithTransition();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  const usernameFromUrl = searchParams.get("username") || "";
  const { broadcast } = useBroadcastSender<{ type: string }>();

  const [token, setToken] = useState("");
  const [verifyButtonLabel, setVerifyButtonLabel] = useState("验证邮箱");
  const [verifyButtonVariant, setVerifyButtonVariant] = useState<
    "secondary" | "outline"
  >("secondary");
  const [verifyButtonLoading, setVerifyButtonLoading] = useState(false);
  const [verifyButtonLoadingText, setVerifyButtonLoadingText] =
    useState("正在验证");

  const [resendButtonLabel, setResendButtonLabel] = useState("重新发送验证码");
  const [_resendButtonVariant, setResendButtonVariant] = useState<
    "secondary" | "outline"
  >("outline");
  const [resendButtonLoading, setResendButtonLoading] = useState(false);
  const [resendButtonLoadingText, setResendButtonLoadingText] =
    useState("发送中");

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [codeTip, setCodeTip] = useState("");
  const [resendDialogOpen, setResendDialogOpen] = useState(false);

  useBroadcast((message: { type: string; token: string }) => {
    if (message?.type === "captcha-solved") {
      setToken(message.token);
    }
  });
  useBroadcast((message: { type: string; token: string }) => {
    if (message?.type === "captcha-error") {
      setVerifyButtonLabel("安全验证失败，请刷新页面重试");
      setVerifyButtonVariant("outline");
    }
  });

  // 验证码验证逻辑
  const validateCode = (value: string) => {
    if (value === "") {
      setCodeTip("");
      return;
    }

    // 验证规则：6位数字
    const codeRegex = /^\d{6}$/;

    if (!codeRegex.test(value)) {
      if (value.length < 6) {
        setCodeTip(" (必须为6位)");
      } else if (value.length > 6) {
        setCodeTip(" (最多6位)");
      } else if (!/^\d+$/.test(value)) {
        setCodeTip(" (只能包含数字)");
      }
    } else {
      setCodeTip("");
    }
  };

  const showMessage = (
    msg: string,
    setter: (label: string) => void,
    variantSetter: (variant: "secondary" | "outline") => void,
  ) => {
    setter(msg);
    variantSetter("outline");
    setTimeout(() => {
      setter(msg === resendButtonLabel ? "重新发送验证码" : "验证邮箱");
      variantSetter(msg === resendButtonLabel ? "outline" : "secondary");
    }, 2000);
  };

  const verifyEmail = async () => {
    if (verifyButtonVariant !== "secondary") return;
    if (!token) {
      showMessage(
        "安全验证失败，请刷新页面重试",
        setVerifyButtonLabel,
        setVerifyButtonVariant,
      );
      return;
    }
    if (!email || !code) {
      showMessage(
        "请填写所有字段",
        setVerifyButtonLabel,
        setVerifyButtonVariant,
      );
      return;
    }
    if (codeTip) {
      showMessage(
        "验证码格式不正确",
        setVerifyButtonLabel,
        setVerifyButtonVariant,
      );
      return;
    }
    setVerifyButtonLoading(true);
    setVerifyButtonLoadingText("验证中");
    setVerifyButtonVariant("outline");

    const result = await verifyEmailAction({
      email,
      code,
      captcha_token: token,
    });

    const responseData =
      result instanceof Response ? await result.json() : result;

    if (responseData.success) {
      setVerifyButtonLoadingText("验证成功，正在跳转...");

      setTimeout(() => {
        navigate(`/login?username=${encodeURIComponent(usernameFromUrl)}`);
      }, 1500);
    } else {
      setVerifyButtonLoadingText(
        responseData.message || "验证失败，请稍后重试",
      );
      setTimeout(() => {
        setVerifyButtonLoading(false);
        setVerifyButtonVariant("secondary");
        setVerifyButtonLabel("验证邮箱");
        broadcast({ type: "captcha-reset" });
      }, 2000);
    }
  };

  const resendEmail = async () => {
    if (resendButtonLoading) return;
    if (!token) {
      showMessage(
        "安全验证失败，请刷新页面重试",
        setResendButtonLabel,
        setResendButtonVariant,
      );
      return;
    }
    if (!email) {
      showMessage(
        "请输入邮箱地址",
        setResendButtonLabel,
        setResendButtonVariant,
      );
      return;
    }

    setResendButtonLoading(true);
    setResendButtonLoadingText("发送中");

    const result = await resendEmailAction({
      email,
      captcha_token: token,
    });

    const responseData =
      result instanceof Response ? await result.json() : result;

    setResendButtonLoadingText(
      responseData.message || "验证码已重新发送，请检查邮箱",
    );
    setTimeout(() => {
      setResendButtonLoading(false);
      setResendButtonLabel("重新发送验证码");
      broadcast({ type: "captcha-reset" });
      setResendDialogOpen(false); // 关闭对话框
    }, 2000);
  };

  // 处理回车键提交
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !verifyButtonLoading) {
      verifyEmail();
    }
  };

  return (
    <>
      <Input
        label="Email / 邮箱"
        disabled={verifyButtonLoading || resendButtonLoading}
        helperText="注册时使用的邮箱地址"
        icon={<RiMailLine size={"1em"} />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <Input
        label="Verification Code / 验证码"
        tips={codeTip}
        disabled={verifyButtonLoading || resendButtonLoading}
        helperText="6位数字验证码"
        icon={<RiShieldKeyholeLine size={"1em"} />}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          validateCode(e.target.value);
        }}
        onKeyPress={handleKeyPress}
      />
      <hr />
      <div className="pt-10 w-full flex flex-col gap-4">
        <CaptchaButton
          label={verifyButtonLabel}
          variant={verifyButtonVariant}
          size="lg"
          fullWidth
          loadingText={verifyButtonLoadingText}
          onClick={verifyEmail}
          loading={verifyButtonLoading}
        />
      </div>
      <div className="pt-3 w-full flex justify-between">
        <div className="text-sm text-muted-foreground">
          已经验证？
          <Link
            href={`/login?username=${encodeURIComponent(usernameFromUrl)}`}
            className="hover:text-primary"
            presets={["hover-underline", "hover-color"]}
          >
            立即登录{">"}
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          <Clickable
            onClick={() => setResendDialogOpen(true)}
            className="hover:text-primary cursor-pointer transition-all duration-300"
            hoverScale={1}
          >
            重新发送验证码
          </Clickable>
        </div>
      </div>

      {/* 重发验证码对话框 */}
      <Dialog
        open={resendDialogOpen}
        onClose={() => setResendDialogOpen(false)}
        title="重新发送验证码"
        size="md"
      >
        <div className="px-6 py-6 space-y-6">
          {/* 说明信息 */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              如果您没有收到验证码邮件，可以点击下方按钮重新发送。
            </p>
            <p className="text-sm text-muted-foreground">
              请确保您输入的邮箱地址正确，并检查垃圾邮件箱。
            </p>
          </div>

          {/* 邮箱显示 */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">邮箱地址</label>
            <p className="text-sm font-mono bg-muted/50 p-3 rounded">
              {email || "未填写邮箱"}
            </p>
          </div>

          {/* 重发按钮 */}
          <div className="pt-4">
            <CaptchaButton
              label={resendButtonLabel}
              size="lg"
              fullWidth
              loadingText={resendButtonLoadingText}
              onClick={resendEmail}
              loading={resendButtonLoading}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
