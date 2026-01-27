import "server-only";

import { getConfigs } from "@/lib/server/config-cache";
import { MenuItem } from "@/lib/server/menu-cache";
import FooterMobile from "../client/Footer/FooterMobile";
import FooterDesktop from "../client/Footer/FooterDesktop";
import { cacheLife, cacheTag } from "next/cache";

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
