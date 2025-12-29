import "server-only";

import { getConfig } from "@/lib/server/config-cache";
import { MenuItem } from "@/lib/server/menu-cache";
import FooterMobile from "../client/Footer/FooterMobile";
import FooterDesktop from "../client/Footer/FooterDesktop";

export default async function Footer({
  menus,
  mainColor,
}: {
  menus: MenuItem[];
  mainColor: string;
}) {
  const [siteBirthday, siteAuthor, siteCopyright] = await Promise.all([
    getConfig<string>("site.birthday"),
    getConfig<string>("author.name"),
    getConfig<string[]>("site.copyright"),
  ]);
  return (
    <>
      <FooterDesktop menus={menus} mainColor={mainColor} />
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
