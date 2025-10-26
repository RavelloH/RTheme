"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-error w-full h-[100vh] flex flex-col items-center justify-center text-white text-2xl gap-5">
        <h1 className="text-7xl">Neutral Press Global Error</h1>
        <h2>触发了一个致命的全局错误。框架已完全崩溃。</h2>
        <div className="opacity-50">
          {error.name} # {error.message}
        </div>
        <div className="opacity-50 font-mono">::{error.digest}::</div>
        <div>
          请尝试刷新页面，如果问题仍然存在，请按下反馈按钮，发送反馈邮件至开发者。
        </div>
        <div>
          <button
            className="border-2 p-2 border-white m-5 hover:opacity-70"
            onClick={() => reset()}
          >
            重新加载此页面
          </button>
          <button
            className="border-2 p-2 border-white m-5 hover:opacity-70"
            onClick={() => {
              window.open(
                `mailto:report@ravelloh.com?subject=Neutral%20Press%20Global%20Error%20Report&body=Error%20Type:%20${encodeURIComponent(error.name)}%0D%0AError%20Message:%20${encodeURIComponent(error.message)}%0D%0AError%20Digest:%20${encodeURIComponent(error.digest || "")}%0D%0AError%20Stack:%0D%0A${encodeURIComponent(error.stack || "")}`,
                "_blank",
              );
            }}
          >
            发送反馈邮件
          </button>
        </div>
      </body>
    </html>
  );
}
