"use client";

import Marquee from "react-fast-marquee";

export interface SocialLinkData {
  platform: string;
  url: string;
  label: string;
  icon: React.ReactNode;
}

interface SocialLinksMarqueeProps {
  /** 链接数据 */
  links: SocialLinkData[];
  /** 显示样式 */
  style: "icons-only" | "icons-with-text" | "text-only";
  /** 行数 */
  rows?: number;
  /** 滚动速度 */
  speed?: number;
}

/**
 * SocialLinksMarquee - 客户端组件
 * 多行无限滚动展示社交链接
 */
export default function SocialLinksMarquee({
  links,
  style,
  rows = 2,
  speed = 30,
}: SocialLinksMarqueeProps) {
  if (links.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-8 text-center">
        暂无社交链接，请在配置中添加
      </div>
    );
  }

  // 将链接分成多行
  const linksPerRow = Math.ceil(links.length / rows);
  const rowsData: SocialLinkData[][] = [];

  for (let i = 0; i < rows; i++) {
    const start = i * linksPerRow;
    const end = start + linksPerRow;
    const rowLinks = links.slice(start, end);
    // 如果这一行有链接，添加到数组
    if (rowLinks.length > 0) {
      rowsData.push(rowLinks);
    }
  }

  // 如果链接太少，只显示一行（rowsData.length 会自动处理）

  return (
    <div className="w-full flex flex-col justify-evenly h-full px-px">
      {rowsData.map((rowLinks, rowIndex) => (
        <Marquee
          key={rowIndex}
          speed={speed}
          autoFill={true}
          pauseOnHover={true}
          direction={rowIndex % 2 === 0 ? "left" : "right"}
          gradient={true}
          gradientWidth={50}
          gradientColor="var(--color-background)"
          className=""
        >
          {rowLinks.map((link, linkIndex) => (
            <a
              key={`${link.platform}-${linkIndex}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 mx-6 px-4 py-2 rounded-sm transition-all duration-300 hover:border-primary hover:bg-primary/5 hover:scale-105"
            >
              {style !== "text-only" && (
                <span className="w-6 h-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  {link.icon}
                </span>
              )}
              {style !== "icons-only" && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {link.label}
                </span>
              )}
            </a>
          ))}
        </Marquee>
      ))}
    </div>
  );
}
