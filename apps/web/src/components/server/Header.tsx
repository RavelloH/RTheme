import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import HeaderWrapper from "@/components/client/Header/HeaderWrapper";
import Menu from "@/components/server/Menu";
import type { MenuItem } from "@/types/menu";

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
