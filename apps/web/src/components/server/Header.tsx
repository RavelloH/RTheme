import "server-only";

import HeaderWrapper from "@/components/client/Header/HeaderWrapper";
import Menu from "@/components/server/Menu";

import { MenuItem } from "@/lib/server/menu-cache";
import { cacheLife, cacheTag } from "next/cache";

export default async function Header({ menus }: { menus: MenuItem[] }) {
  "use cache";
  cacheTag("config", "menus");
  cacheLife("max");
  return (
    <HeaderWrapper>
      <Menu menus={menus} />
    </HeaderWrapper>
  );
}
