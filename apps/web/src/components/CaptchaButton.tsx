import { useCaptcha } from "@/hooks/useCaptcha";
import { Button } from "@/ui/Button";
import { useEffect, useState } from "react";
import { useBroadcastSender } from "@/hooks/useBroadcast";

export function CaptchaButton({
  ...props
}: React.ComponentProps<typeof Button>) {
  const [loading, setLoading] = useState<number | boolean>(0);
  const [loadingText, setLoadingText] = useState<string>("正在确认环境安全");
  const { broadcast } = useBroadcastSender<object>();

  const { solve } = useCaptcha({
    onSolve: (token) => {
      setLoading(false);
      setLoadingText("环境确认成功");
      broadcast({ type: "captcha-solved", token });
    },
    onError: (error) => {
      setLoading(true);
      setLoadingText("环境确认失败，请刷新重试");
      console.error("Captcha error:", error);
    },
    onProgress: (progress) => {
      setLoading(progress);
    },
  });

  useEffect(() => {
    solve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return Button({ loading, loadingText, ...props });
}
