"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import SubscribeClient from "@/app/(build-in)/subscribe/SubscribeClient";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { Dialog } from "@/ui/Dialog";

export default function SubscribeModal() {
  const router = useRouter();
  const navigate = useNavigateWithTransition();
  const [open, setOpen] = useState(true);

  const handleClose = (targetPath?: string) => {
    setOpen(false);
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
      open={open}
      onClose={handleClose}
      title="订阅"
      size="md"
      showCloseButton={true}
      dismissable={true}
    >
      <div className="max-h-[calc(85vh-8em)]">
        <SubscribeClient isModal={true} onRequestClose={handleClose} />
      </div>
    </Dialog>
  );
}
