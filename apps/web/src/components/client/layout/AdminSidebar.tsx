"use client";

import { useEffect, useState } from "react";
import {
  RiArticleFill,
  RiAttachment2,
  RiBarChart2Fill,
  RiDashboardHorizontalFill,
  RiFileFill,
  RiFileInfoFill,
  RiFileShieldFill,
  RiFolder2Fill,
  RiHardDrive3Fill,
  RiInformationFill,
  RiListView,
  RiMenuFill,
  RiMessageFill,
  RiPriceTag3Fill,
  RiSave3Fill,
  RiSearchEyeFill,
  RiSearchFill,
  RiSettings4Fill,
  RiShieldFill,
  RiStethoscopeFill,
  RiTeamFill,
  RiUserFill,
} from "@remixicon/react";
import { usePathname } from "next/navigation";

import Link from "@/components/ui/Link";
import { useMobile } from "@/hooks/use-mobile";

import "@/components/AdminSidebar.css";

const roles = {
  author: ["ADMIN", "EDITOR", "AUTHOR"],
  editor: ["ADMIN", "EDITOR"],
  admin: ["ADMIN"],
};

const AdminSidebarList = [
  {
    name: "仪表盘",
    icon: <RiDashboardHorizontalFill size={"1.5em"} />,
    href: "/admin/dashboard",
    role: roles.admin,
  },
  {
    name: "运行状况检查",
    icon: <RiStethoscopeFill size={"1.5em"} />,
    href: "/admin/doctor",
    role: roles.admin,
  },
  {
    name: "项目管理",
    icon: <RiFolder2Fill size={"1.5em"} />,
    href: "/admin/projects",
    role: roles.editor,
  },
  {
    name: "文章管理",
    icon: <RiArticleFill size={"1.5em"} />,
    href: "/admin/posts",
    role: roles.author,
  },
  {
    name: "评论管理",
    icon: <RiMessageFill size={"1.5em"} />,
    href: "/admin/comments",
    role: roles.author,
  },
  {
    name: "标签管理",
    icon: <RiPriceTag3Fill size={"1.5em"} />,
    href: "/admin/tags",
    role: roles.editor,
  },
  {
    name: "分类管理",
    icon: <RiListView size={"1.5em"} />,
    href: "/admin/categories",
    role: roles.editor,
  },
  {
    name: "页面管理",
    icon: <RiFileFill size={"1.5em"} />,
    href: "/admin/pages",
    role: roles.editor,
  },
  {
    name: "菜单管理",
    icon: <RiMenuFill size={"1.5em"} />,
    href: "/admin/menus",
    role: roles.editor,
  },
  {
    name: "用户管理",
    icon: <RiUserFill size={"1.5em"} />,
    href: "/admin/users",
    role: roles.admin,
  },
  {
    name: "媒体管理",
    icon: <RiAttachment2 size={"1.5em"} />,
    href: "/admin/media",
    role: roles.author,
  },
  {
    name: "存储管理",
    icon: <RiHardDrive3Fill size={"1.5em"} />,
    href: "/admin/storages",
    role: roles.admin,
  },
  {
    name: "友情链接管理",
    icon: <RiTeamFill size={"1.5em"} />,
    href: "/admin/friends",
    role: roles.admin,
  },
  {
    name: "访问分析",
    icon: <RiBarChart2Fill size={"1.5em"} />,
    href: "/admin/analytics",
    role: roles.editor,
  },
  {
    name: "安全中心",
    icon: <RiShieldFill size={"1.5em"} />,
    href: "/admin/security",
    role: roles.admin,
  },
  {
    name: "审计日志",
    icon: <RiFileShieldFill size={"1.5em"} />,
    href: "/admin/audit-logs",
    role: roles.admin,
  },
  {
    name: "搜索洞察",
    icon: <RiSearchEyeFill size={"1.5em"} />,
    href: "/admin/search-insights",
    role: roles.admin,
  },
  {
    name: "搜索索引",
    icon: <RiSearchFill size={"1.5em"} />,
    href: "/admin/search",
    role: roles.admin,
  },
  {
    name: "备份还原",
    icon: <RiSave3Fill size={"1.5em"} />,
    href: "/admin/backups",
    role: roles.admin,
  },
  {
    name: "系统信息",
    icon: <RiInformationFill size={"1.5em"} />,
    href: "/admin/system",
    role: roles.admin,
  },
  {
    name: "版本信息",
    icon: <RiFileInfoFill size={"1.5em"} />,
    href: "/admin/version",
    role: roles.admin,
  },
  {
    name: "设置",
    icon: <RiSettings4Fill size={"1.5em"} />,
    href: "/admin/settings",
    role: roles.admin,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // 从 localStorage 读取用户信息
    try {
      const userInfo = localStorage.getItem("user_info");
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        setUserRole(parsed.role);
      }
    } catch (error) {
      console.error("Failed to parse user_info from localStorage:", error);
    }
  }, []);

  // 根据用户角色过滤菜单项
  const filteredMenuItems = AdminSidebarList.filter((item) => {
    if (!userRole) return false; // 如果没有角色信息，不显示任何菜单
    return item.role.includes(userRole);
  });

  // 移动端：横向面包屑菜单
  if (isMobile) {
    return (
      <div className="w-full h-[4em] border-border overflow-x-auto overflow-y-hidden mb-3">
        <div className="flex items-center h-full gap-2 min-w-max">
          {filteredMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 shrink-0 transition-all duration-200 ${
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-sm font-medium whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // 桌面端:垂直侧边栏
  return (
    <div className="group admin-sidebar relative w-[5em] hover:w-[15em] h-full border-border border transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden bg-background shrink-0 overflow-scroll">
      {filteredMenuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`h-[3em] border border-border flex items-center cursor-pointer relative group/item ${pathname.split("/")[2] === item.href.split("/")[2] ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          <div className="w-[5em] flex items-center justify-center shrink-0 group-hover/item:scale-[1.2] transition-transform duration-300">
            {item.icon}
          </div>
          <div className="w-[10em] flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
            <span className="text-base font-medium">{item.name}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
