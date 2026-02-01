"use client";

import { useState } from "react";
import { RiAlertLine, RiRefreshLine } from "@remixicon/react";

import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";

export default function ErrorPage({
  reason,
  reset,
}: {
  reason?: Error;
  reset?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center text-muted-foreground"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <AutoTransition type="scale">
        {hover && reset ? (
          <Clickable key="refresh" onClick={reset}>
            <RiRefreshLine size={"3em"} />
          </Clickable>
        ) : (
          <div>
            <RiAlertLine size={"3em"} key="icon" />
          </div>
        )}
      </AutoTransition>
      {reason && <div className="text-xl mt-4 mb-2">{reason.message}</div>}
    </div>
  );
}
