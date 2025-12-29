import "server-only";

import HeaderWrapper from "@/components/client/Header/HeaderWrapper";
import Menu from "@/components/server/Menu";

import { MenuItem } from "@/lib/server/menu-cache";

export default async function Header({ menus }: { menus: MenuItem[] }) {
  return (
    <HeaderWrapper>
      <Menu menus={menus} />
    </HeaderWrapper>
  );
}
