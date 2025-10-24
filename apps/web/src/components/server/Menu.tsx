import "server-only";

import { MenuItem } from "@/lib/server/menuCache";
import MenuWrapper from "../client/Menu/MenuWrapper";
import { MenuFooter, MenuHeader, MenuLayout } from "../client/Menu/MenuMiscs";
import { getConfig } from "@/lib/server/configCache";
import Marquee from "react-fast-marquee";
import Link from "../Link";
import MenuItemWrapper from "../client/Menu/MenuItemLayout";
import * as RemixIcon from "@remixicon/react";

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

export default async function Menu({ menus }: { menus: MenuItem[] }) {
  const [slogan, title, copyright, author, birthday] = await Promise.all([
    getConfig<string>("site.slogan.secondary"),
    getConfig<string>("site.title"),
    getConfig<string[]>("site.copyright"),
    getConfig<string>("site.author"),
    getConfig<string>("site.birthday"),
  ]);

  const mainMenus = menus.filter(
    (menu) => menu.category === "MAIN" && menu.status === "ACTIVE",
  );
  const commonMenus = menus.filter(
    (menu) => menu.category === "COMMON" && menu.status === "ACTIVE",
  );
  const outsiteMenus = menus.filter(
    (menu) => menu.category === "OUTSITE" && menu.status === "ACTIVE",
  );

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
          <MenuLayout>
            {/* 主要导航 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                主要导航
              </h3>
              <MenuItemWrapper>
                <div className="grid grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden">
                  {mainMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="relative w-full overflow-hidden group"
                      data-menu-id={menu.id}
                    >
                      <div className="absolute inset-0 bg-muted z-0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] origin-left" />
                      <Link
                        href={getLinkHref(menu)}
                        target={menu.link ? "_blank" : undefined}
                        rel={menu.link ? "noopener noreferrer" : undefined}
                        data-link={menu.link || getLinkHref(menu)}
                        className="w-full text-left p-3 flex items-center space-x-3 relative z-10 bg-transparent"
                      >
                        {menu.icon && <Icon iconName={menu.icon} />}
                        <span>{menu.name}</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </MenuItemWrapper>
            </div>

            {/* 常用链接 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                常用链接
              </h3>
              <MenuItemWrapper>
                <div className="grid grid-cols-1 gap-2">
                  {commonMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="relative w-full overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-muted z-0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] origin-left" />
                      <Link
                        href={getLinkHref(menu)}
                        target={menu.link ? "_blank" : undefined}
                        rel={menu.link ? "noopener noreferrer" : undefined}
                        data-link={menu.link || getLinkHref(menu)}
                        className="w-full text-left p-3 flex items-center space-x-3 relative z-10 bg-transparent"
                      >
                        {menu.icon && <Icon iconName={menu.icon} />}
                        <span>{menu.name}</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </MenuItemWrapper>
            </div>

            {/* 外部链接 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground border-b border-border pb-2 text-center">
                外部链接
              </h3>
              <MenuItemWrapper>
                <div className="grid grid-cols-1 gap-2">
                  {outsiteMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className="relative w-full overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-muted z-0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] origin-left" />
                      <Link
                        href={getLinkHref(menu)}
                        target={menu.link ? "_blank" : undefined}
                        rel={menu.link ? "noopener noreferrer" : undefined}
                        data-link={menu.link || getLinkHref(menu)}
                        className="w-full text-left p-3 flex items-center justify-between relative z-10 bg-transparent"
                      >
                        <div className="flex items-center space-x-3">
                          {menu.icon && <Icon iconName={menu.icon} />}
                          <span>{menu.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          <RemixIcon.RiArrowRightUpLongLine className="w-6 h-6" />
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              </MenuItemWrapper>
            </div>
          </MenuLayout>
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
