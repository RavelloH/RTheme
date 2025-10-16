import BackLink from "@/components/BackLink";
import Link from "@/components/Link";
import { RiArrowRightUpLongLine } from "@remixicon/react";

interface BackLinkButtonProps {
  text?: string;
  mode?: "back" | "link";
  href?: string;
  className?: string;
}

export default function LinkButton({
  text = "//////",
  mode = "link",
  className = "",
  href,
}: BackLinkButtonProps) {
  const content = (
    <>
      <div className="pl-10 relative">
        <span className="relative inline-block">
          <span data-fade-char>{text}</span>
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out"></span>
        </span>
      </div>
      <div className="h-full aspect-square bg-primary text-primary-foreground flex items-center justify-center">
        <RiArrowRightUpLongLine
          size={"1.5em"}
          className="transform group-hover:scale-130 transition-transform duration-300 ease-out"
        />
      </div>
    </>
  );

  if (mode === "back") {
    return (
      <BackLink
        className={
          "flex items-center justify-between w-full h-full group " + className
        }
      >
        {content}
      </BackLink>
    );
  }

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
