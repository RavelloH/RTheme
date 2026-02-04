"use client";

import { useEffect, useState } from "react";

export interface UserInfo {
  uid: number;
  username: string;
  nickname?: string;
  role: string;
  exp?: string;
  lastRefresh?: string;
}

/**
 * 从 localStorage 获取用户信息的 Hook
 * @returns 用户信息对象，未登录时返回 null
 */
export function useUserInfo(): UserInfo | null {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    try {
      const userInfoStr = localStorage.getItem("user_info");
      if (userInfoStr) {
        const parsed: UserInfo = JSON.parse(userInfoStr);
        setUserInfo(parsed);
      }
    } catch (error) {
      console.error("Failed to parse user info:", error);
    }
  }, []);

  return userInfo;
}
