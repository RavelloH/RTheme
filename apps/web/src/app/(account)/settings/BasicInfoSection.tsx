"use client";

import React from "react";

interface UserProfile {
  uid: number;
  username: string;
  email: string;
}

interface BasicInfoSectionProps {
  user: UserProfile;
}

/**
 * 基本信息板块组件
 */
export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
          基本信息
        </h2>
        <p className="text-muted-foreground text-sm">
          查看和管理你的账户基本信息
        </p>
      </div>

      <div className="bg-background border border-foreground/10 rounded-sm p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-foreground/10">
            <div>
              <p className="text-sm text-muted-foreground">用户名</p>
              <p className="text-foreground font-medium">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-foreground/10">
            <div>
              <p className="text-sm text-muted-foreground">邮箱</p>
              <p className="text-foreground font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-muted-foreground">用户ID</p>
              <p className="text-foreground font-medium font-mono">
                {user.uid}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
