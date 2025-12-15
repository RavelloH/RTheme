import "server-only";

import { MenuItem } from "@/lib/server/menuCache";
import FooterDesktop from "../client/Footer/FooterDesktop";

export default async function FooterDesktopWrapper({
  menus,
  mainColor,
}: {
  menus: MenuItem[];
  mainColor: string;
}) {
  return <FooterDesktop menus={menus} mainColor={mainColor} />;
}
