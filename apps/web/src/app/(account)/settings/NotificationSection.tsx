"use client";

import React from "react";
import WebPushManager from "./WebPushManager";

/**
 * 通知管理板块组件
 */
export const NotificationSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
          通知管理
        </h2>
        <p className="text-muted-foreground text-sm">管理你的通知偏好设置</p>
      </div>

      <div className="bg-background border border-foreground/10 rounded-sm p-6">
        {/* Web Push 通知设置 */}
        <WebPushManager />
      </div>
    </div>
  );
};
