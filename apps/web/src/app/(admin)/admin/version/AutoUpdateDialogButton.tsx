"use client";

import { useState } from "react";
import { RiRadarLine } from "@remixicon/react";

import { Dialog } from "@/ui/Dialog";

export default function AutoUpdateDialogButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="h-full w-full flex gap-2 items-center justify-center text-2xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
      >
        <RiRadarLine size="1.1em" /> 自动更新
      </button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="自动更新"
        size="md"
      >
        <div className="px-6 py-6"></div>
      </Dialog>
    </>
  );
}
