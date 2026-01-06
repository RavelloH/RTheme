"use client";

import type { UserSearchResult } from "@repo/shared-types/api/message";
import UserAvatar from "@/components/UserAvatar";
import { RiChatNewLine } from "@remixicon/react";
import Clickable from "@/ui/Clickable";

interface UserSearchItemProps {
  user: UserSearchResult;
  onSelect: (uid: number) => void;
}

export default function UserSearchItem({
  user,
  onSelect,
}: UserSearchItemProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 
                 hover:bg-foreground/5 rounded-sm
                 transition-colors duration-200 cursor-pointer"
      onClick={() => onSelect(user.uid)}
    >
      {/* 用户信息 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatar
          username={user.nickname || user.username}
          avatarUrl={user.avatar}
          emailMd5={user.emailMd5}
          shape="circle"
          className="!block w-10 h-10 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">
            {user.nickname || user.username}
          </h4>
          <p className="text-sm text-muted-foreground truncate">
            UID: {user.uid} · @{user.username}
          </p>
        </div>
      </div>

      {/* 选择按钮 */}
      <Clickable
        onClick={(e) => {
          e.stopPropagation();
          onSelect(user.uid);
        }}
      >
        <RiChatNewLine size="1.25em" />
      </Clickable>
    </div>
  );
}
