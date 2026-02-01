import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import FooterDesktop from "@/components/client/Footer/FooterDesktop";
import FooterMobile from "@/components/client/Footer/FooterMobile";
import { getConfigs } from "@/lib/server/config-cache";
import type { MenuItem } from "@/types/menu";

export default async function Footer({ menus }: { menus: MenuItem[] }) {
  "use cache";
  cacheTag("config", "menus");
  cacheLife("max");
  const [siteBirthday, siteAuthor, siteCopyright] = await getConfigs([
    "site.birthday",
    "author.name",
    "site.copyright",
  ]);
  return (
    <>
      <FooterDesktop menus={menus} />
      <FooterMobile siteBirthday={siteBirthday} siteAuthor={siteAuthor}>
        {siteCopyright.map((line, idx) => (
          <span key={idx}>
            <br />
            <span dangerouslySetInnerHTML={{ __html: line }}></span>
          </span>
        ))}
      </FooterMobile>
    </>
  );
}
