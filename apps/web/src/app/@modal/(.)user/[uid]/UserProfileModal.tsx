"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/ui/Dialog";
import type {
  UserProfile,
  UserActivityItem,
} from "@repo/shared-types/api/user";
import UserProfileClient from "@/components/client/UserProfileClient";
import { useNavigateWithTransition } from "@/components/Link";

interface UserProfileModalProps {
  profile: UserProfile;
  initialActivities: UserActivityItem[];
  hasMore: boolean;
  isGuest: boolean;
}

export default function UserProfileModal({
  profile,
  initialActivities,
  hasMore,
  isGuest,
}: UserProfileModalProps) {
  const router = useRouter();
  const navigate = useNavigateWithTransition();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = (targetPath?: string) => {
    setIsOpen(false); // 触发 Dialog 退出动画
    setTimeout(() => {
      if (targetPath) {
        router.back();
        setTimeout(() => navigate(targetPath), 50); // 跳转到目标页面
      } else {
        router.back(); // 仅关闭模态框
      }
    }, 200); // 等待 Dialog 动画完成
  };

  const displayName = profile.user.nickname || profile.user.username;

  return (
    <Dialog
      open={isOpen}
      onClose={() => handleClose()}
      title={`${displayName} 的个人主页`}
      size="xl"
      showCloseButton={true}
      dismissable={true}
    >
      <UserProfileClient
        profile={profile}
        initialActivities={initialActivities}
        hasMore={hasMore}
        isGuest={isGuest}
        isModal={true}
        onRequestClose={handleClose}
      />
    </Dialog>
  );
}
