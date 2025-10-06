"use client";

import type { MenuItem } from "@/lib/server/menuCache";
import { useConfig } from "@/components/ConfigProvider";

export default function FooterMobile({ menus }: { menus: MenuItem[] }) {
  const { config } = useConfig();
  return (
    <footer className="text-muted-foreground bg-background border-t text px-10 py-10 border-border">
      <span>
        Copyright ©{" "}
        {(() => {
          const startYear = new Date(
            config<string>("site.birthday"),
          ).getFullYear();
          const currentYear = new Date().getFullYear();
          return startYear === currentYear
            ? startYear
            : `${startYear} - ${currentYear}`;
        })()}{" "}
        {config<string>("site.author")}.
      </span>
      {config<Array<string>>("site.copyright").map((line, idx) => (
        <span key={idx}>
          <br />
          <span dangerouslySetInnerHTML={{ __html: line }}></span>
        </span>
      ))}
    </footer>
  );
}
