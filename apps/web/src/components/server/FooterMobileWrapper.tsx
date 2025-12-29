import "server-only";

import { getConfig } from "@/lib/server/config-cache";
import FooterMobile from "../client/Footer/FooterMobile";

export default async function FooterMobileWrapper() {
  const [siteBirthday, siteAuthor, siteCopyright] = await Promise.all([
    getConfig<string>("site.birthday"),
    getConfig<string>("author.name"),
    getConfig<string[]>("site.copyright"),
  ]);

  return (
    <FooterMobile siteBirthday={siteBirthday} siteAuthor={siteAuthor}>
      {siteCopyright.map((line, idx) => (
        <span key={idx}>
          <br />
          <span dangerouslySetInnerHTML={{ __html: line }}></span>
        </span>
      ))}
    </FooterMobile>
  );
}
