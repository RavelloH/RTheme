import { useCallback, useEffect, useRef } from "react";
import { createChallenge, verifyChallenge } from "@/actions/captcha";

interface CaptchaCallbacks {
  onError?: (error: unknown) => void;
  onProgress?: (progress: number) => void;
  onSolve?: (token: string) => void;
  onReset?: () => void;
}

// 事件类型定义
interface CapEvent {
  detail: {
    progress?: number;
    token?: string;
    message?: string;
    isCap?: boolean;
  };
}

// 动态导入Cap类
let CapClass: unknown = null;

async function loadCap() {
  if (typeof window !== "undefined" && !CapClass) {
    const widgetModule = await import("@cap.js/widget");
    CapClass = widgetModule.default || widgetModule.Cap;
  }
  return CapClass;
}

export function useCaptcha(callbacks?: CaptchaCallbacks) {
  const capRef = useRef<unknown>(null);
  const isInitializedRef = useRef(false);

  const initializeCaptcha = useCallback(async () => {
    if (isInitializedRef.current) return;

    // 动态加载Cap类
    const CapClass = await loadCap();
    if (!CapClass) {
      throw new Error("Failed to load Cap.js widget");
    }

    // 设置自定义fetch
    window.CAP_CUSTOM_FETCH = async function (url, options) {
      const result =
        url === "/challenge"
          ? await createChallenge()
          : url === "/redeem" &&
              options?.body &&
              typeof options.body === "string"
            ? await verifyChallenge(JSON.parse(options.body))
            : null;

      if (result && "success" in result && result.success && result.data) {
        return new Response(JSON.stringify(result.data));
      }

      return new Response(
        JSON.stringify({ error: "Failed to create challenge" }),
        {
          status: 500,
        },
      );
    };

    // 创建新的Captcha实例
    const CapConstructor = CapClass as new (config?: {
      apiEndpoint?: string;
    }) => {
      addEventListener: (
        type: string,
        listener: (event: CapEvent) => void,
      ) => void;
      solve: () => Promise<{ success: boolean; token: string }>;
      reset: () => void;
    };

    const capInstance = new CapConstructor();

    capRef.current = capInstance;

    // 添加事件监听器
    if (callbacks?.onError) {
      capInstance.addEventListener("error", (event: CapEvent) => {
        callbacks.onError?.(event.detail);
      });
    } else {
      capInstance.addEventListener("error", (event: CapEvent) => {
        console.error("Captcha error:", event.detail);
      });
    }

    if (callbacks?.onProgress) {
      capInstance.addEventListener("progress", (event: CapEvent) => {
        callbacks.onProgress?.(event.detail.progress || 0);
      });
    } else {
      capInstance.addEventListener("progress", (event: CapEvent) => {
        console.log(`Captcha progress: ${event.detail.progress}%`);
      });
    }

    if (callbacks?.onSolve) {
      capInstance.addEventListener("solve", (event: CapEvent) => {
        callbacks.onSolve?.(event.detail.token || "");
      });
    } else {
      capInstance.addEventListener("solve", (event: CapEvent) => {
        console.log("Captcha solved, token:", event.detail.token);
      });
    }

    if (callbacks?.onReset) {
      capInstance.addEventListener("reset", () => {
        callbacks.onReset?.();
      });
    } else {
      capInstance.addEventListener("reset", () => {
        console.log("Captcha reset");
      });
    }

    isInitializedRef.current = true;
  }, [callbacks]);

  const solve = useCallback(async () => {
    if (!capRef.current) {
      await initializeCaptcha();
    }

    if (capRef.current) {
      const capInstance = capRef.current as {
        solve: () => Promise<{ success: boolean; token: string }>;
      };
      return await capInstance.solve();
    }

    throw new Error("Captcha not initialized");
  }, [initializeCaptcha]);

  const reset = useCallback(() => {
    if (capRef.current) {
      const capInstance = capRef.current as { reset: () => void };
      capInstance.reset();
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (capRef.current) {
        // 清理Captcha实例
        capRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  return {
    solve,
    reset,
    isReady: isInitializedRef.current,
  };
}
