"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import SearchClient from "@/app/(build-in)/search/SearchClient";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { Dialog } from "@/ui/Dialog";

export default function SearchModal() {
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
      onClose={() => handleClose()}
      title="全站搜索"
      size="lg"
      showCloseButton={true}
      dismissable={true}
    >
      <div className="max-h-[calc(90vh-10em)]">
        <SearchClient isModal={true} onRequestClose={handleClose} />
      </div>
    </Dialog>
  );
}
