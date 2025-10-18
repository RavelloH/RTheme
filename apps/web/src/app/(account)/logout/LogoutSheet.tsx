"use client";

import { logout } from "@/actions/auth";
import { useNavigateWithTransition } from "@/components/Link";
import { AutoTransition } from "@/ui/AutoTransition";
import { useEffect, useState, useRef } from "react";

async function performLogout() {
  const result = await logout({});
  if (result.success) {
    localStorage.removeItem("user_info");
    return true;
  } else {
    return false;
  }
}

export default function LogoutSheet() {
  const [loadingTitle, setLoadingTitle] = useState("Waiting for Logout...");
  const [loadingDescription, setLoadingDescription] =
    useState("正在退出登录...");
  const hasLoggedOut = useRef(false);
  const navigate = useNavigateWithTransition();

  useEffect(() => {
    // 防止 React Strict Mode 导致的重复执行
    if (hasLoggedOut.current) return;
    hasLoggedOut.current = true;

    // 从 URL 参数中获取 redirect 地址
    const searchParams = new URLSearchParams(window.location.search);
    const redirectParam = searchParams.get("redirect");
    const redirectUrl = redirectParam || "/";
    const redirectMessage = redirectParam
      ? "即将跳转到下个页面..."
      : "即将返回首页...";

    const userInfo = localStorage.getItem("user_info");
    if (!userInfo) {
      setLoadingTitle("当前无活跃会话");
      setLoadingDescription(redirectMessage);
      setTimeout(() => {
        navigate(redirectUrl);
      }, 3000);
    } else {
      performLogout().then((success) => {
        if (success) {
          setLoadingTitle("当前会话已退出");
          setLoadingDescription(redirectMessage);
          setTimeout(() => {
            navigate(redirectUrl);
          }, 3000);
        } else {
          setLoadingTitle("退出失败");
          setLoadingDescription("请稍后重试...");
        }
      });
    }
  }, [navigate]);

  return (
    <div className="w-full h-full min-h-[70vh] flex justify-center items-center flex-col gap-4">
      <div>
        <h1 className="text-6xl">
          <AutoTransition>{loadingTitle}</AutoTransition>
        </h1>
      </div>
      <div className="text-2xl">
        <AutoTransition>{loadingDescription}</AutoTransition>
      </div>
    </div>
  );
}
