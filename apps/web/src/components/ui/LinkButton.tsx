"use client";

import { cloneElement } from "react";
import { RiArrowRightUpLongLine } from "@remixicon/react";

import Link, { useBackNavigation } from "@/components/ui/Link";

interface BackLinkButtonProps {
  text?: React.ReactNode;
  mode?: "back" | "link" | "onClick";
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export default function LinkButton({
  text = "//////",
  mode = "link",
  className = "",
  onClick,
  icon,
  href,
}: BackLinkButtonProps) {
  const back = useBackNavigation();

  const content = (
    <>
      <div className="pl-10 relative">
        <span className="relative inline-block">
          <span data-fade-char>{text}</span>
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out"></span>
        </span>
      </div>
      <div className="h-full aspect-square bg-primary text-primary-foreground flex items-center justify-center">
        {icon ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cloneElement(icon as React.ReactElement<any>, {
            size: "1.5em",
            className:
              "transform group-hover:scale-130 transition-transform duration-300 ease-out",
          })
        ) : (
          <RiArrowRightUpLongLine
            size={"1.5em"}
            className="transform group-hover:scale-130 transition-transform duration-300 ease-out"
          />
        )}
      </div>
    </>
  );

  if (mode === "back") {
    return (
      <div
        className={
          "flex items-center justify-between w-full h-full group cursor-pointer " +
          className
        }
        onClick={() => {
          back();
        }}
      >
        {content}
      </div>
    );
  } else if (mode === "onClick") {
    return (
      <div
        className={
          "flex items-center justify-between w-full h-full group " + className
        }
        onClick={onClick}
      >
        {content}
      </div>
    );
  } else {
    // link mode
    if (!href) {
      return null;
    }

    return (
      <Link
        href={href}
        className={
          "flex items-center justify-between w-full h-full group " + className
        }
      >
        {content}
      </Link>
    );
  }
}
