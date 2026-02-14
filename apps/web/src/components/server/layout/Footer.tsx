import "server-only";

import FooterDesktop from "@/components/client/layout/footer/FooterDesktop";
import FooterMobile from "@/components/client/layout/footer/FooterMobile";
import type { MenuItem } from "@/types/menu";

export default function Footer({ menus }: { menus: MenuItem[] }) {
  return (
    <>
      <FooterDesktop menus={menus} />
      <FooterMobile />
    </>
  );
}
