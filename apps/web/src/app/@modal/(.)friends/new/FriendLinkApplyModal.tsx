"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  FriendLinkApplySiteProfile,
  FriendLinkApplyUser,
} from "@/app/(build-in)/friends/new/apply-context";
import FriendLinkApplyClient from "@/app/(build-in)/friends/new/FriendLinkApplyClient";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { Dialog } from "@/ui/Dialog";

interface FriendLinkApplyModalProps {
  currentUser: FriendLinkApplyUser | null;
  applyEnabled: boolean;
  checkBackLinkEnabled: boolean;
  siteProfile: FriendLinkApplySiteProfile;
}

export default function FriendLinkApplyModal({
  currentUser,
  applyEnabled,
  checkBackLinkEnabled,
  siteProfile,
}: FriendLinkApplyModalProps) {
  const router = useRouter();
  const navigate = useNavigateWithTransition();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = (targetPath?: string) => {
    setIsOpen(false);
    setTimeout(() => {
      if (targetPath) {
        router.back();
        setTimeout(() => {
          navigate(targetPath);
        }, 50);
        return;
      }

      router.back();
    }, 200);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => handleClose()}
      title="友情链接申请与管理"
      size="xl"
      showCloseButton={true}
      dismissable={true}
    >
      <div className="h-[calc(90vh-8em)]">
        <FriendLinkApplyClient
          currentUser={currentUser}
          applyEnabled={applyEnabled}
          checkBackLinkEnabled={checkBackLinkEnabled}
          siteProfile={siteProfile}
          isModal={true}
          onRequestClose={handleClose}
        />
      </div>
    </Dialog>
  );
}
