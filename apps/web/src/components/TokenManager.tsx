"use client";

import { refresh } from "@/actions/auth";
import { useEffect } from "react";

interface UserInfo {
  uid: number;
  username: string;
  nickname: string;
  exp: string; // ISO string
  lastRefresh: string; // ISO string
}

export default function TokenManager() {
  useEffect(() => {
    // 仅在页面加载完成后运行
    const handleTokenRefresh = async () => {
      try {
        // 读取localStorage中的user_info
        const userInfoStr = localStorage.getItem("user_info");

        if (!userInfoStr) {
          return;
        }

        // 解析用户信息
        let userInfo: UserInfo;
        try {
          userInfo = JSON.parse(userInfoStr);
        } catch (error) {
          console.error("Failed to parse user_info:", error);
          localStorage.removeItem("user_info");
          return;
        }

        // 验证用户信息格式
        if (
          !userInfo.uid ||
          !userInfo.username ||
          !userInfo.exp ||
          !userInfo.lastRefresh
        ) {
          console.error("Invalid user_info format");
          localStorage.removeItem("user_info");
          return;
        }

        const now = new Date();
        const lastRefresh = new Date(userInfo.lastRefresh);
        const exp = new Date(userInfo.exp);

        // 检查是否在10分钟之内
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        if (lastRefresh > tenMinutesAgo) {
          // 在10分钟之内，什么都不做
          return;
        }

        // 检查是否已经过期
        if (exp <= now) {
          console.log("Token has expired, removing user_info");
          localStorage.removeItem("user_info");
          return;
        }

        // 在10分钟之前且未过期，调用refresh函数
        console.log("Refreshing access token...");
        const result = await refresh({
          token_transport: "cookie",
        });

        const response =
          result instanceof Response ? await result.json() : result;

        if (response.success) {
          // 更新用户信息和lastRefresh时间
          const updatedUserInfo: UserInfo = {
            ...userInfo,
            lastRefresh: now.toISOString(),
          };
          localStorage.setItem("user_info", JSON.stringify(updatedUserInfo));
          console.log("Token refreshed successfully");
        } else {
          console.error("Failed to refresh token:", response.statusText);
        }
      } catch (error) {
        console.error("Error during token refresh:", error);
      }
    };

    handleTokenRefresh();
  }, []);
  return null;
}
