"use client";

import { Input } from "@/ui/Input";
import { RiLockPasswordLine, RiUser3Line } from "@remixicon/react";
import { CaptchaButton } from "../../components/CaptchaButton";
import { useState } from "react";
import { useBroadcast } from "@/hooks/useBroadcast";
import { login as loginAction } from "@/actions/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/Link";

export default function LoginSheet() {
  const Router = useRouter();
  const searchParams = useSearchParams();
  const usernameFromUrl = searchParams.get("username") || "";

  const [token, setToken] = useState("");
  const [buttonLabel, setButtonLabel] = useState("登录");
  const [buttonVariant, setButtonVariant] = useState<"secondary" | "outline">(
    "secondary",
  );
  const [buttonLoading, setButtonLoading] = useState(false);
  const [buttonLoadingText, setButtonLoadingText] =
    useState("正在确认环境安全");
  const [username, setUsername] = useState(usernameFromUrl);
  const [password, setPassword] = useState("");
  const [usernameTip, setUsernameTip] = useState("");
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
      setButtonLabel("登录");
      setButtonVariant("secondary");
    }, 2000);
  };

  const login = async () => {
    if (buttonVariant !== "secondary") return;
    if (!token) {
      showMessage("安全验证失败，请刷新页面重试");
      return;
    }
    if (!username || !password) {
      showMessage("请填写所有字段");
      return;
    }
    if (usernameTip) {
      showMessage("用户名格式不正确");
      return;
    }
    if (passwordTip) {
      showMessage("密码格式不正确");
      return;
    }
    setButtonLoading(true);
    setButtonLoadingText("登录");
    setButtonVariant("outline");

    const result = await loginAction({
      username,
      password,
      token_transport: "cookie",
      captcha_token: token,
    });

    const responseData =
      result instanceof Response ? await result.json() : result;

    if (responseData.success) {
      setButtonLoadingText("登录成功，正在跳转...");

      // 获取redirect参数
      const redirectParam = searchParams.get("redirect");
      const targetPath = redirectParam ? redirectParam : "/profile";

      setTimeout(() => {
        Router.push(targetPath);
      }, 1500);
    } else {
      // 处理特定的错误情况
      if (responseData.error?.code === "EMAIL_NOT_VERIFIED") {
        setButtonLoadingText("请先验证邮箱后再登录");
        setTimeout(() => {
          Router.push(`/verify?username=${encodeURIComponent(username)}`);
        }, 2000);
      } else {
        setButtonLoadingText(responseData.message || "登录失败，请稍后重试");
        setTimeout(() => {
          setButtonLoading(false);
          setButtonVariant("secondary");
          setButtonLabel("登录");
        }, 2000);
      }
    }
  };

  return (
    <>
      <Input
        label="Username / 用户名"
        tips={usernameTip}
        disabled={buttonLoading}
        helperText="3-20位，仅能包含小写字母、数字、下划线，且以小写字母开头"
        icon={<RiUser3Line size={"1em"} />}
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          validateUsername(e.target.value);
        }}
      />
      <Input
        label="Password / 密码"
        tips={passwordTip}
        disabled={buttonLoading}
        helperText="6-100位"
        type="password"
        icon={<RiLockPasswordLine size={"1em"} />}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          validatePassword(e.target.value);
        }}
      />
      <hr />
      <div className="pt-10 w-full">
        <CaptchaButton
          label={buttonLabel}
          variant={buttonVariant}
          size="lg"
          fullWidth
          loadingText={buttonLoadingText}
          onClick={login}
          loading={buttonLoading}
        />
      </div>
      <div className="pt-3 w-full flex justify-between">
        <div className="text-sm text-muted-foreground">
          还没有账号？
          <Link
            href="/register"
            className="hover:text-primary"
            presets={["hover-underline", "hover-color"]}
          >
            立即注册{">"}
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          <Link
            href="/reset-password"
            className="hover:text-primary"
            presets={["hover-underline", "hover-color"]}
          >
            忘记账号/密码?
          </Link>
        </div>
      </div>
    </>
  );
}
