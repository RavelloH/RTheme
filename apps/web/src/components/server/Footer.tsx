import "server-only";

import { getConfig } from "@/lib/server/configCache";
import { MenuItem } from "@/lib/server/menuCache";
import FooterMobile from "../client/Footer/FooterMobile";
import FooterDesktop from "../client/Footer/FooterDesktop";

export default async function Footer({ menus }: { menus: MenuItem[] }) {
  const [siteBirthday, siteAuthor, siteCopyright] = await Promise.all([
    getConfig<string>("site.birthday"),
    getConfig<string>("site.author"),
    getConfig<string[]>("site.copyright"),
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
