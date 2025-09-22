"use client";

import { useRouter } from "next/navigation";

interface MenuProps {
  setIsMenuOpen: (open: boolean) => void;
}

export function Menu({ setIsMenuOpen }: MenuProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    router.push(path);
  };

  const menuItems = [
    { path: "/", title: "首页", description: "返回主页" },
    { path: "/posts", title: "文章", description: "浏览所有文章" },
    { path: "/categories", title: "分类", description: "按分类浏览" },
    { path: "/tags", title: "标签", description: "按标签浏览" },
    { path: "/about", title: "关于", description: "了解更多信息" },
    { path: "/search", title: "搜索", description: "搜索内容" },
  ];

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">菜单</h2>
        <nav className="space-y-4">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="w-full text-left block p-4 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {item.description}
              </p>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
