import { useCaptcha } from "@/hooks/useCaptcha";
import { Button } from "@/ui/Button";
import { useEffect, useState } from "react";
import { useBroadcastSender } from "@/hooks/useBroadcast";

export function CaptchaButton({
  loading: externalLoading,
  loadingText: externalLoadingText,
  ...props
}: React.ComponentProps<typeof Button>) {
  const [internalLoading, setInternalLoading] = useState<number | boolean>(0);
  const [internalLoadingText, setInternalLoadingText] =
    useState<string>("正在确认环境安全");
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

  const { solve } = useCaptcha({
    onSolve: (token) => {
      setInternalLoading(false);
      setInternalLoadingText("环境确认成功");
      broadcast({ type: "captcha-solved", token });
    },
    onError: (error) => {
      setInternalLoading(true);
      setInternalLoadingText("环境确认失败，请刷新重试");
      console.error("Captcha error:", error);
    },
    onProgress: (progress) => {
      setInternalLoading(progress);
    },
  });

  useEffect(() => {
    solve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return Button({ ...props, loading, loadingText });
}
