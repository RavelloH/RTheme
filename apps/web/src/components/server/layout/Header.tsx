import "server-only";

import HeaderWrapper from "@/components/client/layout/header/HeaderWrapper";
import Menu from "@/components/server/layout/Menu";
import type { MenuItem } from "@/types/menu";

interface HeaderProps {
  menus: MenuItem[];
  slogan: string;
  title: string;
  copyright: string[];
  author: string;
  birthday: string;
}

export default function Header({
  menus,
  slogan,
  title,
  copyright,
  author,
  birthday,
}: HeaderProps) {
  return (
    <HeaderWrapper>
      <Menu
        menus={menus}
        slogan={slogan}
        title={title}
        copyright={copyright}
        author={author}
        birthday={birthday}
      />
    </HeaderWrapper>
  );
}
