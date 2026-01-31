import React from "react";

export default function Canvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-muted/10">{children}</div>
  );
}
