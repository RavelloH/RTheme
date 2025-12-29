"use client";

import React from "react";
import { Button } from "@/ui/Button";
import { formatRelativeTime } from "@/lib/shared/relative-time";
import type { BasicInfoDialogsRef } from "./BasicInfoDialogs";

interface UserProfile {
  uid: number;
  username: string;
  email: string;
  nickname: string | null;
  website: string | null;
  bio: string | null;
  role: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
  createdAt: string;
}

interface BasicInfoSectionProps {
  user: UserProfile;
  basicInfoDialogsRef?: React.RefObject<BasicInfoDialogsRef | null>;
}

// 角色名称映射
const roleNameMap: Record<string, string> = {
  USER: "普通用户",
  ADMIN: "管理员",
  EDITOR: "编辑",
  AUTHOR: "作者",
};

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * 基本信息板块组件
 */
export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  user,
  basicInfoDialogsRef,
}) => {
  const handleEdit = (
    field: "nickname" | "username" | "email" | "website" | "bio",
  ) => {
    const currentValue = user[field] || "";
    basicInfoDialogsRef?.current?.openEditDialog(field, currentValue);
  };

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

      {/* 用户 ID */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            用户 ID
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium font-mono">
                {user.uid}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                你的唯一用户标识符
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 昵称 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            昵称
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-foreground font-medium">
                {user.nickname || "未设置"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {user.nickname ? "你的显示名称" : "你还没有设置昵称"}
              </p>
            </div>
            <Button
              label="编辑"
              onClick={() => handleEdit("nickname")}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 用户名 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            用户名
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-foreground font-medium">{user.username}</p>
              <p className="text-sm text-muted-foreground mt-1">
                用于登录的唯一用户名
              </p>
            </div>
            <Button
              label="编辑"
              onClick={() => handleEdit("username")}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 用户邮箱 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            用户邮箱
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-foreground font-medium">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                用于接收通知和账户恢复
              </p>
            </div>
            <Button
              label="编辑"
              onClick={() => handleEdit("email")}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 网站 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            网站
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {user.website ? (
                <>
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-medium hover:text-primary transition-colors"
                  >
                    {user.website}
                  </a>
                  <p className="text-sm text-muted-foreground mt-1">
                    你的个人网站或社交链接
                  </p>
                </>
              ) : (
                <>
                  <p className="text-foreground font-medium">未设置</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    你还没有设置个人网站
                  </p>
                </>
              )}
            </div>
            <Button
              label="编辑"
              onClick={() => handleEdit("website")}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 个人简介 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            个人简介
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {user.bio ? "你的个人介绍" : "你还没有填写个人简介"}
              </p>
              <Button
                label="编辑"
                onClick={() => handleEdit("bio")}
                variant="secondary"
                size="sm"
              />
            </div>
            {user.bio && (
              <p className="text-foreground font-medium whitespace-pre-wrap break-words">
                {user.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 账户角色 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            账户角色
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium">
                {roleNameMap[user.role] || user.role}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                你的账户权限等级
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 注册时间 */}
      <div className="bg-background border border-foreground/10 rounded-sm">
        <div className="px-6 py-4 border-b border-foreground/10">
          <h3 className="text-lg font-medium text-foreground tracking-wider">
            注册时间
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium">
                {formatDate(user.createdAt)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                加入于 {formatRelativeTime(user.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
