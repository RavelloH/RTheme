"use client";

import { useMobile } from "@/hooks/use-mobile";

export default function FooterMobile({
  children,
  siteBirthday,
  siteAuthor,
}: {
  children: React.ReactNode;
  siteBirthday: string;
  siteAuthor: string;
}) {
  const isMobile = useMobile();

  return isMobile ? (
    <footer className="text-muted-foreground bg-background border-t text px-10 py-10 border-border">
      <span>
        Copyright ©{" "}
        {(() => {
          const startYear = new Date(siteBirthday).getFullYear();
          const currentYear = new Date().getFullYear();
          return startYear === currentYear
            ? startYear
            : `${startYear} - ${currentYear}`;
        })()}{" "}
        {siteAuthor}.
      </span>
      {children}
    </footer>
  ) : null;
}
