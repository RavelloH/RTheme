import "server-only";

import { MenuItem } from "@/lib/server/menu-cache";
import FooterDesktop from "../client/Footer/FooterDesktop";

export default async function FooterDesktopWrapper({
  menus,
}: {
  menus: MenuItem[];
}) {
  return <FooterDesktop menus={menus} />;
}
