"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import {
  RiGithubFill,
  RiGoogleFill,
  RiLockPasswordLine,
  RiMicrosoftFill,
  RiUser3Line,
} from "@remixicon/react";
import { useSearchParams } from "next/navigation";

import { login as loginAction } from "@/actions/auth";
import { verifyTotp } from "@/actions/totp";
import PasskeyLoginButton from "@/app/(account)/login/PasskeyLoginButton";
import { CaptchaButton } from "@/components/CaptchaButton";
import Link, { useNavigateWithTransition } from "@/components/Link";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";
import type { OAuthProvider } from "@/lib/server/oauth";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import Clickable from "@/ui/Clickable";
import { Input } from "@/ui/Input";
import { BackupCodeInput, OtpInput } from "@/ui/OtpInput";
import { useToast } from "@/ui/Toast";

interface LoginSheetProps {
  enabledSSOProviders: OAuthProvider[];
  passkeyEnabled: boolean;
}

interface SSOLoginResult {
  success: boolean;
  userInfo: {
    uid: number;
    username: string;
    nickname: string | null;
    email: string;
    avatar: string | null;
    role: string;
    exp: string;
  };
  message: string;
}

export default function LoginSheet({
  enabledSSOProviders,
  passkeyEnabled,
}: LoginSheetProps) {
  const navigate = useNavigateWithTransition();
  const searchParams = useSearchParams();
  const usernameFromUrl = searchParams.get("username") || "";
  const ssoStatus = searchParams.get("sso");
  const messageParam = searchParams.get("message");
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");
  const { broadcast } = useBroadcastSender<{ type: string }>();
  const toast = useToast();

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
  const hasProcessedSSO = useRef(false);
  const hasProcessedMessage = useRef(false);

  // TOTP 相关状态
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);
  const [totpError, setTotpError] = useState(false);
  const [totpVerifying, setTotpVerifying] = useState(false);
  const [totpMessage, setTotpMessage] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const totpTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TOTP 倒计时器
  useEffect(() => {
    if (requiresTotp && timeRemaining > 0) {
      totpTimerRef.current = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      // 超时，返回到密码输入
      setRequiresTotp(false);
      setTotpCode("");
      setBackupCode("");
      setIsUsingBackupCode(false);
      setTimeRemaining(300);
      toast.error("验证超时，请重新登录");
    }

    return () => {
      if (totpTimerRef.current) {
        clearTimeout(totpTimerRef.current);
      }
    };
  }, [requiresTotp, timeRemaining, toast]);

  // 处理 URL 参数中的消息（message/success/error）
  useEffect(() => {
    if (hasProcessedMessage.current) return;

    if (messageParam || successParam || errorParam) {
      hasProcessedMessage.current = true;

      // 显示对应的消息
      if (messageParam) {
        toast.info(messageParam);
      } else if (successParam) {
        toast.success(successParam);
      } else if (errorParam) {
        toast.error(errorParam);
      }

      // 清除 URL 中的消息参数
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("message");
      newSearchParams.delete("success");
      newSearchParams.delete("error");

      // 使用 router.replace 来更新 URL 而不添加历史记录
      const newUrl = newSearchParams.toString()
        ? `/login?${newSearchParams.toString()}`
        : "/login";
      window.history.replaceState({}, "", newUrl);
    }
  }, [messageParam, successParam, errorParam, searchParams, toast]);

  // 处理 SSO 登录结果
  useEffect(() => {
    if (!ssoStatus || hasProcessedSSO.current) return;

    hasProcessedSSO.current = true;

    if (ssoStatus === "success") {
      // 读取 Cookie 中的结果
      const resultCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sso_login_result="));

      if (resultCookie) {
        const resultValue = decodeURIComponent(
          resultCookie.split("=")[1] || "",
        );
        try {
          const result: SSOLoginResult = JSON.parse(resultValue);

          // 清除 Cookie
          document.cookie =
            "sso_login_result=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

          // 禁用所有交互，跳过验证码验证
          setButtonLoading(true);
          setButtonLoadingText(result.message || "登录成功，正在跳转...");
          setButtonVariant("outline");
          setButtonLabel(result.message || "登录成功");

          // 保存用户信息到 localStorage
          const userInfo = {
            lastRefresh: new Date(),
            ...result.userInfo,
          };
          localStorage.setItem("user_info", JSON.stringify(userInfo));

          // 触发自定义事件通知同一标签页内的组件
          window.dispatchEvent(
            new CustomEvent("localStorageUpdate", {
              detail: { key: "user_info" },
            }),
          );

          // 获取 redirect 参数
          const redirectParam = searchParams.get("redirect");
          const targetPath = redirectParam ? redirectParam : "/";

          // 3秒后跳转
          setTimeout(() => {
            navigate(targetPath);
          }, 3000);
        } catch (error) {
          console.error("Failed to parse SSO result:", error);
          setButtonLabel("登录失败，请重试");
          setButtonVariant("outline");
          setTimeout(() => {
            setButtonLabel("登录");
            setButtonVariant("secondary");
          }, 2000);
        }
      } else {
        setButtonLabel("未找到登录信息");
        setButtonVariant("outline");
        setTimeout(() => {
          setButtonLabel("登录");
          setButtonVariant("secondary");
        }, 2000);
      }
    } else if (ssoStatus === "error") {
      // 读取错误信息
      const errorCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sso_login_error="));

      let errorMessage = "登录失败，请稍后重试";
      if (errorCookie) {
        errorMessage = decodeURIComponent(errorCookie.split("=")[1] || "");
        // 清除 Cookie
        document.cookie =
          "sso_login_error=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }

      // 使用 Toast 显示错误消息 10 秒
      toast.error(errorMessage, undefined, 10000);

      // 清除 URL 参数
      const url = new URL(window.location.href);
      url.searchParams.delete("sso");
      window.history.replaceState({}, "", url.toString());
    }
  }, [ssoStatus, navigate, searchParams, toast]);

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
      // 检查是否需要 TOTP 验证
      if (responseData.data?.requiresTotp) {
        setRequiresTotp(true);
        setButtonLoading(false);
        setButtonVariant("secondary");
        setButtonLabel("验证");
        setTimeRemaining(300); // 重置倒计时
        return;
      }

      setButtonLoadingText("登录成功，正在跳转...");

      // 保存用户信息
      const userInfo = {
        lastRefresh: new Date(),
        ...responseData.data?.userInfo,
      };
      localStorage.setItem("user_info", JSON.stringify(userInfo));

      // 触发自定义事件通知同一标签页内的组件
      window.dispatchEvent(
        new CustomEvent("localStorageUpdate", {
          detail: { key: "user_info" },
        }),
      );

      // 获取redirect参数
      const redirectParam = searchParams.get("redirect");
      const targetPath = redirectParam ? redirectParam : "/";

      setTimeout(() => {
        navigate(targetPath);
      }, 1500);
    } else {
      // 处理特定的错误情况
      if (responseData.error?.code === "EMAIL_NOT_VERIFIED") {
        setButtonLoadingText("请先验证邮箱后再登录");
        setTimeout(() => {
          navigate(`/email-verify?username=${encodeURIComponent(username)}`);
        }, 2000);
      } else if (responseData.error?.code === "PASSWORD_RESET_REQUIRED") {
        setButtonLoadingText(responseData.message || "密码重置邮件已发送");
        setTimeout(() => {
          navigate(`/reset-password?reason=NEEDS_UPDATE`);
        }, 2000);
      } else {
        setButtonLoadingText(responseData.message || "登录失败，请稍后重试");
        setTimeout(() => {
          setButtonLoading(false);
          setButtonVariant("secondary");
          setButtonLabel("登录");
          broadcast({ type: "captcha-reset" });
        }, 2000);
      }
    }
  };

  // TOTP 验证
  const verifyTotpCode = async (code?: string) => {
    // 防止重复提交
    if (totpVerifying) return;

    // 使用传入的 code 或当前状态值
    const codeToVerify = code || (isUsingBackupCode ? backupCode : totpCode);

    if (isUsingBackupCode) {
      if (!codeToVerify || codeToVerify.length !== 9) {
        return;
      }
    } else {
      if (!codeToVerify || codeToVerify.length !== 6) {
        return;
      }
    }

    setTotpVerifying(true);
    setTotpMessage("验证中...");

    const result = await verifyTotp({
      totp_code: isUsingBackupCode ? undefined : codeToVerify,
      backup_code: isUsingBackupCode ? codeToVerify : undefined,
      token_transport: "cookie",
    });

    const responseData =
      result instanceof Response ? await result.json() : result;

    if (responseData.success) {
      setTotpMessage("验证成功，正在跳转...");

      // 保存用户信息
      const userInfo = {
        lastRefresh: new Date(),
        ...responseData.data?.userInfo,
      };
      localStorage.setItem("user_info", JSON.stringify(userInfo));

      // 触发自定义事件通知同一标签页内的组件
      window.dispatchEvent(
        new CustomEvent("localStorageUpdate", {
          detail: { key: "user_info" },
        }),
      );

      // 获取redirect参数
      const redirectParam = searchParams.get("redirect");
      const targetPath = redirectParam ? redirectParam : "/";

      setTimeout(() => {
        navigate(targetPath);
      }, 1500);
    } else {
      setTotpError(true);

      // 检查是否超过失败次数限制
      if (responseData.error?.code === "TOTP_VERIFICATION_FAILED") {
        setTotpMessage("验证失败次数过多，请重新登录");
        setTimeout(() => {
          // 返回到密码输入
          setRequiresTotp(false);
          setTotpCode("");
          setBackupCode("");
          setIsUsingBackupCode(false);
          setTotpError(false);
          setTotpVerifying(false);
          setTotpMessage("");
          setTimeRemaining(300);
          setButtonLoading(false);
          setButtonVariant("secondary");
          setButtonLabel("登录");
        }, 2000);
      } else {
        setTotpMessage(responseData.message || "验证失败，请重试");
        setTimeout(() => {
          setTotpVerifying(false);
          setTotpMessage("");
          setTotpCode("");
          setBackupCode("");
          setTotpError(false);
        }, 2000);
      }
    }
  };

  // 处理回车键提交
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !buttonLoading) {
      login();
    }
  };

  return (
    <AutoTransition type="scale" duration={0.4} className="w-full">
      {!requiresTotp ? (
        // 密码登录界面
        <div key="login">
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
            onKeyPress={handleKeyPress}
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

          {/* SSO 登录选项和通行密钥登录 */}
          {(enabledSSOProviders.length > 0 || passkeyEnabled) && (
            <div className="pt-6 w-full">
              {enabledSSOProviders.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted-foreground/30"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-background text-muted-foreground">
                        或使用以下方式登录
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
                </>
              )}
              {/* 通行密钥登录（浏览器支持则显示） */}
              {passkeyEnabled && (
                <>
                  {enabledSSOProviders.length === 0 && (
                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-muted-foreground/30"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-background text-muted-foreground">
                          或使用以下方式登录
                        </span>
                      </div>
                    </div>
                  )}
                  <Suspense>
                    <PasskeyLoginButton disabled={buttonLoading} />
                  </Suspense>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div key="totp-verification">
          <div className="mb-6">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-semibold text-foreground tracking-wider mb-2">
                两步验证
              </h3>
              <AutoTransition>
                <p
                  className={`text-sm ${
                    totpMessage
                      ? totpError
                        ? "text-error"
                        : "text-muted-foreground"
                      : "text-muted-foreground"
                  }`}
                  key={totpMessage || isUsingBackupCode.toString()}
                >
                  {totpMessage ||
                    (isUsingBackupCode
                      ? "请输入 8 位数字备份码以继续。"
                      : "此账号受两步验证保护， 请输入验证器中的 6 位数字验证码以继续。")}
                </p>
              </AutoTransition>
            </div>
          </div>

          <AutoTransition>
            {!isUsingBackupCode ? (
              <div className="mb-6" key="totp-input">
                <OtpInput
                  value={totpCode}
                  onChange={setTotpCode}
                  disabled={totpVerifying}
                  onComplete={verifyTotpCode}
                  error={totpError}
                  autoFocus
                />
              </div>
            ) : (
              <div className="mb-6" key="backup-code-input">
                <BackupCodeInput
                  value={backupCode}
                  onChange={setBackupCode}
                  disabled={totpVerifying}
                  onComplete={verifyTotpCode}
                  error={totpError}
                  autoFocus
                />
              </div>
            )}
          </AutoTransition>

          <div className="mb-6 flex justify-center">
            <Clickable
              onClick={() => {
                setIsUsingBackupCode(!isUsingBackupCode);
                setTotpCode("");
                setBackupCode("");
                setTotpError(false);
                setTotpMessage("");
              }}
              disabled={totpVerifying}
              className="text-sm text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUsingBackupCode ? "使用验证器验证码" : "使用备份码"}
            </Clickable>
          </div>
        </div>
      )}
    </AutoTransition>
  );
}
