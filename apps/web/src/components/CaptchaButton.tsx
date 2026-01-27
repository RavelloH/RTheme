import { useCaptcha } from "@/hooks/use-captcha";
import { Button } from "@/ui/Button";
import { useEffect, useState } from "react";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";

interface CaptchaButtonProps extends React.ComponentProps<typeof Button> {
  /**
   * 自定义验证过程中的文本，如果未提供则使用默认文本 "正在执行安全验证"
   */
  verificationText?: string;
}

export function CaptchaButton({
  loading: externalLoading,
  loadingText: externalLoadingText,
  verificationText,
  ...props
}: CaptchaButtonProps) {
  const [internalLoading, setInternalLoading] = useState<number | boolean>(0);
  const [internalLoadingText, setInternalLoadingText] = useState<string>(
    verificationText || "正在执行安全验证",
  );
  const { broadcast } = useBroadcastSender<object>();

  // 自身进度 0-99 时使用自身，100 时优先使用外部
  const loading =
    typeof internalLoading === "number" && internalLoading < 100
      ? internalLoading
      : externalLoading !== undefined
        ? externalLoading
        : internalLoading;
  const loadingText =
    typeof internalLoading === "number" && internalLoading < 100
      ? internalLoadingText
      : externalLoadingText !== undefined
        ? externalLoadingText
        : internalLoadingText;

  const { solve, reset } = useCaptcha({
    onSolve: (token) => {
      setInternalLoading(false);
      setInternalLoadingText("环境安全成功");
      broadcast({ type: "captcha-solved", token });
    },
    onError: (error) => {
      setInternalLoading(true);
      setInternalLoadingText("环境安全确认失败，请刷新重试");
      broadcast({ type: "captcha-error", error });
      console.error("Captcha error:", error);
    },
    onProgress: (progress) => {
      setInternalLoading(progress);
    },
  });

  useEffect(() => {
    setInternalLoadingText(verificationText || "正在执行安全验证");
  }, [verificationText]);

  useEffect(() => {
    solve();
  }, [solve]);

  // 监听重置验证码的广播消息
  useBroadcast((message: { type: string }) => {
    if (message?.type === "captcha-reset") {
      setInternalLoading(0);
      setInternalLoadingText(verificationText || "正在执行安全验证");
      reset();
      solve();
    }
  });

  return Button({ ...props, loading, loadingText });
}
