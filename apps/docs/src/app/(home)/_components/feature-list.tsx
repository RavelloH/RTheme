"use client";

import { useReveal, useLineReveal, useStagger } from "./use-gsap";
import {
  FileText,
  Layout,
  FolderArchive,
  Image as ImageIcon,
  Shield,
  BarChart3,
  MessageSquare,
  Search,
  Mail,
  Rss,
  Briefcase,
  Link2,
  HardDrive,
  Activity,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "内容管理",
    desc: "所见即所得编辑、Markdown/MDX、草稿箱、版本管理、SEO 优化",
  },
  {
    icon: Layout,
    title: "页面系统",
    desc: "拖拽区块编辑器、实时预览、HTML/MDX 页面",
  },
  {
    icon: FolderArchive,
    title: "归档系统",
    desc: "标签和分类两个维度组织文章，支持自定义",
  },
  {
    icon: ImageIcon,
    title: "媒体管理",
    desc: "自动压缩、图片优化、防盗链、照片墙、Exif 展示",
  },
  {
    icon: Shield,
    title: "安全体系",
    desc: "WAF、IP 封禁、PoW 验证码、Passkey、TOTP 双因素认证",
  },
  {
    icon: BarChart3,
    title: "访问统计",
    desc: "访客分析、关键词、来源、设备分析、自动报表",
  },
  {
    icon: MessageSquare,
    title: "评论系统",
    desc: "嵌套回复、评论审核、点赞、反垃圾系统",
  },
  {
    icon: Search,
    title: "搜索系统",
    desc: "高性能分词与索引，中文内容及编程术语优化",
  },
  {
    icon: Mail,
    title: "通知系统",
    desc: "站内信、Email、WebPush 推送，精细化订阅策略",
  },
  { icon: Rss, title: "订阅系统", desc: "RSS 订阅、邮件通讯录订阅" },
  {
    icon: Briefcase,
    title: "作品系统",
    desc: "项目展示网格布局、GitHub 仓库卡片同步",
  },
  {
    icon: Link2,
    title: "友链系统",
    desc: "自助申请、自动抓取元信息、健康度巡检",
  },
  {
    icon: HardDrive,
    title: "存储系统",
    desc: "本地/S3/R2/Vercel Blob/GitHub Pages 多策略并存",
  },
  {
    icon: Activity,
    title: "诊断系统",
    desc: "定时健康检查、性能分析、Serverless 定时任务",
  },
];

export function FeatureList() {
  const titleRef = useReveal({ y: 20 });
  const lineRef = useLineReveal();
  const listRef = useStagger({ staggerDelay: 0.05, y: 15 });

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <hr
          ref={lineRef}
          className="border-t border-fd-border mb-12 md:mb-16"
        />

        <div ref={titleRef} className="mb-12">
          <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium block mb-3">
            完整功能
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-fd-foreground tracking-tight">
            一键部署，你就可以拥有
          </h2>
        </div>

        <div ref={listRef} className="border-t border-fd-border">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group grid grid-cols-12 gap-4 items-baseline py-5 border-b border-fd-border transition-colors hover:bg-fd-accent/30"
              >
                <div className="col-span-1 flex items-center pl-10">
                  <Icon className="h-4 w-4 text-fd-muted-foreground group-hover:text-fd-foreground transition-colors" />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <span className="text-sm font-semibold text-fd-foreground tracking-tight">
                    {feature.title}
                  </span>
                </div>
                <div className="col-span-8 md:col-span-9">
                  <span className="text-sm text-fd-muted-foreground">
                    {feature.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
