"use client";

import { useState } from "react";
import {
  RiGithubFill,
  RiGoogleFill,
  RiLockPasswordLine,
  RiMailLine,
  RiMicrosoftFill,
  RiUser3Line,
} from "@remixicon/react";

import { register as registerAction } from "@/actions/auth";
import { CaptchaButton } from "@/components/ui/CaptchaButton";
import Link, { useNavigateWithTransition } from "@/components/ui/Link";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";

export default function RegisterSheet({
  canRegister,
  emailVerificationRequired,
  enabledSSOProviders,
}: {
  canRegister: boolean;
  emailVerificationRequired: boolean;
  enabledSSOProviders: string[];
}) {
  const navigate = useNavigateWithTransition();
  const { broadcast } = useBroadcastSender<{ type: string }>();

  const [token, setToken] = useState("");
  const [buttonLabel, setButtonLabel] = useState(
    canRegister ? "注册" : "此站点已关闭注册",
  );
  const [buttonVariant, setButtonVariant] = useState<"secondary" | "outline">(
    "secondary",
  );
  const [buttonLoading, setButtonLoading] = useState(false);
  const [buttonLoadingText, setButtonLoadingText] =
    useState("正在确认环境安全");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameTip, setUsernameTip] = useState("");
  const [emailTip, setEmailTip] = useState("");
  const [passwordTip, setPasswordTip] = useState("");

  useBroadcast((message: { type: string; token: string }) => {
    if (message?.type === "captcha-solved") {
      setToken(message.token);
    }
  });
  useBroadcast((message: { type: string; token: string }) => {
    if (message?.type === "captcha-error") {
      setButtonLabel("安全验证失败，请刷新页面重试");
      setButtonVariant("outline");
    }
  });

  // Username 验证逻辑
  const validateUsername = (value: string) => {
    if (value === "") {
      setUsernameTip("");
      return;
    }

    // 验证规则：3-20位，仅能包含小写字母、数字、下划线，且以小写字母开头
    const usernameRegex = /^[a-z][a-z0-9_]{2,19}$/;

    if (!usernameRegex.test(value)) {
      if (value.length < 3) {
        setUsernameTip(" (最少3位)");
      } else if (value.length > 20) {
        setUsernameTip(" (最多20位)");
      } else if (!/^[a-z]/.test(value)) {
        setUsernameTip(" (必须以小写字母开头)");
      } else if (!/^[a-z][a-z0-9_]*$/.test(value)) {
        setUsernameTip(" (只能包含小写字母、数字、下划线)");
      }
    } else {
      setUsernameTip("");
    }
  };

  // Email 验证逻辑
  const validateEmail = (value: string) => {
    if (value === "") {
      setEmailTip("");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      setEmailTip("(邮箱格式不正确)");
    } else {
      setEmailTip("");
    }
  };

  // Password 验证逻辑
  const validatePassword = (value: string) => {
    if (value === "") {
      setPasswordTip("");
      return;
    }

    if (value.length < 6) {
      setPasswordTip("(最少6位)");
    } else if (value.length > 100) {
      setPasswordTip("(最多100位)");
    } else {
      setPasswordTip("");
    }
  };

  const showMessage = (msg: string) => {
    setButtonLabel(msg);
    setButtonVariant("outline");
    setTimeout(() => {
      setButtonLabel("注册");
      setButtonVariant("secondary");
    }, 2000);
  };

  const register = async () => {
    if (buttonVariant !== "secondary") return;
    if (!token) {
      showMessage("安全验证失败，请刷新页面重试");
      return;
    }
    if (!username || !email || !password) {
      showMessage("请填写所有字段");
      return;
    }
    if (usernameTip) {
      showMessage("用户名格式不正确");
      return;
    }
    if (emailTip) {
      showMessage("邮箱格式不正确");
      return;
    }
    if (passwordTip) {
      showMessage("密码格式不正确");
      return;
    }
    setButtonLoading(true);
    setButtonLoadingText("注册");
    setButtonVariant("outline");

    const result = await registerAction({
      username,
      email,
      password,
      captcha_token: token,
    });

    const responseData =
      result instanceof Response ? await result.json() : result;

    if (responseData.success) {
      // TODO：redirect传递
      if (emailVerificationRequired) {
        setButtonLoadingText("注册成功，请检查邮箱来验证账户");
        setTimeout(() => {
          navigate(
            `/email-verify?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`,
          );
        }, 2000);
      } else {
        setButtonLoadingText("注册成功，正在跳转...");
        setTimeout(() => {
          navigate(`/login?username=${encodeURIComponent(username)}`);
        }, 2000);
      }
    } else {
      setButtonLoadingText(responseData.message || "注册失败，请稍后重试");
      setTimeout(() => {
        setButtonLoading(false);
        setButtonVariant("secondary");
        setButtonLabel("注册");
        broadcast({ type: "captcha-reset" });
      }, 2000);
    }
  };

  // 处理回车键提交
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !buttonLoading && canRegister) {
      register();
    }
  };

  return (
    <>
      <Input
        label="Username / 用户名"
        tips={usernameTip}
        disabled={!canRegister || buttonLoading}
        helperText="3-20位，仅能包含小写字母、数字、下划线，且以小写字母开头"
        icon={<RiUser3Line size={"1em"} />}
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          validateUsername(e.target.value);
        }}
        onKeyPress={handleKeyPress}
      />
      <Input
        label="Email / 邮箱"
        tips={emailTip}
        disabled={!canRegister || buttonLoading}
        helperText=""
        icon={<RiMailLine size={"1em"} />}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          validateEmail(e.target.value);
        }}
        onKeyPress={handleKeyPress}
      />
      <Input
        label="Password / 密码"
        tips={passwordTip}
        disabled={!canRegister || buttonLoading}
        helperText="6-100位"
        type="password"
        icon={<RiLockPasswordLine size={"1em"} />}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          validatePassword(e.target.value);
        }}
        onKeyPress={handleKeyPress}
      />
      <hr />
      <div className="pt-10 w-full">
        <CaptchaButton
          label={buttonLabel}
          variant={buttonVariant}
          size="lg"
          fullWidth
          loadingText={buttonLoadingText}
          onClick={register}
          loading={buttonLoading}
          disabled={!canRegister}
        />
      </div>
      <div className="pt-3 w-full flex justify-between">
        <div className="text-sm text-muted-foreground">
          已有账号？
          <Link
            href="/login"
            className="hover:text-primary"
            presets={["hover-underline", "hover-color"]}
          >
            立即登录{">"}
          </Link>
        </div>
      </div>
      {/* SSO 登录选项 */}
      {enabledSSOProviders.length > 0 && (
        <div className="pt-6 w-full">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted-foreground/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                或使用以下方式注册
              </span>
            </div>
          </div>
          <div
            className={`mt-6 grid gap-3 ${
              enabledSSOProviders.length === 1
                ? "grid-cols-1"
                : enabledSSOProviders.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
            }`}
          >
            {enabledSSOProviders.includes("google") && (
              <Button
                onClick={() => navigate("/sso/google/login")}
                label=""
                icon={<RiGoogleFill size={"1.5em"} />}
                variant="secondary"
                size="lg"
                disabled={buttonLoading}
              ></Button>
            )}
            {enabledSSOProviders.includes("github") && (
              <Button
                onClick={() => navigate("/sso/github/login")}
                label=""
                icon={<RiGithubFill size={"1.5em"} />}
                variant="secondary"
                size="lg"
                disabled={buttonLoading}
              ></Button>
            )}
            {enabledSSOProviders.includes("microsoft") && (
              <Button
                onClick={() => navigate("/sso/microsoft/login")}
                label=""
                icon={<RiMicrosoftFill size={"1.5em"} />}
                variant="secondary"
                size="lg"
                disabled={buttonLoading}
              ></Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
