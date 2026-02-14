"use client";

import { useConfig } from "@/context/ConfigContext";
import { useMobile } from "@/hooks/use-mobile";

export default function FooterMobile() {
  const isMobile = useMobile();
  const siteBirthday = useConfig("site.birthday");
  const siteAuthor = useConfig("author.name");
  const siteCopyright = useConfig("site.copyright");

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
      {siteCopyright.map((line, idx) => (
        <span key={idx}>
          <br />
          <span dangerouslySetInnerHTML={{ __html: line }}></span>
        </span>
      ))}
    </footer>
  ) : null;
}
