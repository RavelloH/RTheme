import "server-only";

import Marquee from "react-fast-marquee";
import * as RemixIcon from "@remixicon/react";

import type {
  MenuItemData,
  MenuSectionData,
} from "@/components/client/layout/menu/MenuItemLayout";
import MenuItemWrapper from "@/components/client/layout/menu/MenuItemLayout";
import {
  MenuFooter,
  MenuHeader,
} from "@/components/client/layout/menu/MenuMiscs";
import MenuWrapper from "@/components/client/layout/menu/MenuWrapper";
import { getConfigs } from "@/lib/server/config-cache";
import type { MenuItem } from "@/types/menu";

function getLinkHref(menu: MenuItem): string {
  return (
    menu.link ||
    (menu.slug ? `/${menu.slug}` : menu.page?.slug ? `/${menu.page.slug}` : "#")
  );
}

function Icon({ iconName }: { iconName: string }) {
  const convertToComponentName = (name: string): string => {
    const parts = name.split("-");
    const converted = parts
      .map((part) => {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join("");
    return `Ri${converted}`;
  };

  const componentName = convertToComponentName(iconName);
  const IconComponent = (
    RemixIcon as Record<string, React.ComponentType<{ size?: string }>>
  )[componentName];

  if (!IconComponent) {
    console.warn(
      `Icon component not found: ${componentName}, using fallback icon`,
    );
    return <RemixIcon.RiArrowRightUpBoxFill size="1.5em" />;
  }

  return <IconComponent size="1.5em" />;
}

function toMenuItemData(menu: MenuItem): MenuItemData {
  const href = getLinkHref(menu);
  return {
    id: menu.id,
    icon: menu.icon ? <Icon iconName={menu.icon} /> : undefined,
    name: menu.name,
    href,
    target: menu.link ? "_blank" : undefined,
    rel: menu.link ? "noopener noreferrer" : undefined,
    dataLink: menu.link || href,
  };
}

function toOutsiteMenuItemData(menu: MenuItem): MenuItemData {
  const base = toMenuItemData(menu);
  return {
    ...base,
    trailing: (
      <span className="text-muted-foreground ml-auto">
        <RemixIcon.RiArrowRightUpLongLine className="w-6 h-6" />
      </span>
    ),
  };
}

export default async function Menu({ menus }: { menus: MenuItem[] }) {
  const [slogan, title, copyright, author, birthday] = await getConfigs([
    "site.slogan.secondary",
    "site.title",
    "site.copyright",
    "author.name",
    "site.birthday",
  ]);

  const mainMenus = menus.filter((menu) => menu.category === "MAIN");
  const commonMenus = menus.filter((menu) => menu.category === "COMMON");
  const outsiteMenus = menus.filter((menu) => menu.category === "OUTSITE");
  const sections: MenuSectionData[] = [
    {
      id: "main",
      title: "主要导航",
      items: mainMenus.map(toMenuItemData),
    },
    {
      id: "common",
      title: "常用链接",
      items: commonMenus.map(toMenuItemData),
    },
    {
      id: "outsite",
      title: "外部链接",
      items: outsiteMenus.map(toOutsiteMenuItemData),
    },
  ];

  return (
    <MenuWrapper>
      <MenuHeader>
        <span>{`// ${slogan} //`}</span>
      </MenuHeader>

      <div className="flex-1 w-full overflow-y-hidden">
        <div className="w-full h-[25%] text-5xl border-y border-border">
          <Marquee speed={40} autoFill={true} className="h-full text-7xl">
            <span>{title}</span>
            <span>&nbsp;&nbsp;/&nbsp;&nbsp;</span>
          </Marquee>
        </div>

        <div className="p-6 overflow-y-auto h-[calc(100%-25%)]">
          <MenuItemWrapper sections={sections} />
        </div>
      </div>

      <MenuFooter siteAuthor={author} siteBirthday={birthday}>
        {copyright.map((line, idx) => (
          <span key={idx}>
            <span className="px-2">/</span>
            <span dangerouslySetInnerHTML={{ __html: line }}></span>
          </span>
        ))}
      </MenuFooter>
    </MenuWrapper>
  );
}
