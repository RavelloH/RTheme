"use client";

import Image from "next/image";
import { useReveal, useLineReveal } from "./use-gsap";

interface FeatureBlockProps {
  index: string;
  title: string;
  description: string;
  images: { src: string; alt: string }[];
}

function FeatureBlock({
  index,
  title,
  description,
  images,
}: FeatureBlockProps) {
  const lineRef = useLineReveal();
  const textRef = useReveal({ y: 30 });
  const imgRef = useReveal({ y: 30 });

  return (
    <div className="py-16 md:py-20">
      <hr ref={lineRef} className="border-t border-fd-border mb-12 md:mb-16" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
        {/* Text */}
        <div ref={textRef} className="md:col-span-4">
          <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium mb-4 block">
            {index}
          </span>
          <h3 className="text-2xl md:text-3xl font-bold text-fd-foreground tracking-tight leading-tight">
            {title}
          </h3>
          <p className="mt-4 text-fd-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        {/* Images */}
        <div ref={imgRef} className="md:col-span-8">
          {images.map((img, i) => (
            <div
              key={i}
              className={`relative ${i > 0 ? "mt-4 md:-mt-28" : ""}`}
              style={{ zIndex: i + 1 }}
            >
              <div
                style={{ "--stack-x": `${-i * 15}%` } as React.CSSProperties}
                className="md:[transform:translateX(var(--stack-x))]"
              >
                <div className="border border-fd-border overflow-hidden shadow-lg">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={1920}
                    height={1080}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Features() {
  const sectionTitleRef = useReveal({ y: 20 });

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div ref={sectionTitleRef} className="mb-4">
          <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium">
            核心功能
          </span>
        </div>

        <FeatureBlock
          index="01"
          title="行云流水的内容系统"
          description="所见即所得、支持 Markdown / MDX 可视化编辑、草稿箱、版本管理，内置 SEO 深度优化。三合一编辑器，满足不同写作偏好。"
          images={[
            { src: "/repo/admin/admin-3.webp", alt: "文章所见即所得编辑器" },
            { src: "/repo/admin/admin-4.webp", alt: "文章 Markdown 编辑器" },
          ]}
        />

        <FeatureBlock
          index="02"
          title="独具匠心的页面系统"
          description="支持拖拽组件、实时预览，也可使用 HTML / Markdown / MDX 新建页面。区块编辑器让页面搭建如同搭积木。"
          images={[
            { src: "/repo/admin/admin-13.webp", alt: "区块编辑器" },
            { src: "/repo/admin/admin-14.webp", alt: "区块编辑器（正在拖拽）" },
          ]}
        />

        <FeatureBlock
          index="03"
          title="详细的访问统计"
          description="内置访客分析、搜索关键词与全站关键词对比、访客来源、设备分析、文章热度分析，自动发送日报/周报/月报。"
          images={[
            { src: "/repo/admin/admin-5.webp", alt: "访问分析页面（总览）" },
            { src: "/repo/admin/admin-6.webp", alt: "访问分析页面（来源）" },
          ]}
        />

        <FeatureBlock
          index="04"
          title="强大的媒体管理"
          description="自动压缩、图片优化、防盗链、短链接、照片墙、Exif 信息展示。同时支持本地、S3、R2、Vercel Blob 等多种存储后端。"
          images={[
            { src: "/repo/admin/admin-8.webp", alt: "媒体文件管理（网格）" },
            { src: "/repo/admin/admin-19.webp", alt: "媒体文件管理（列表）" },
          ]}
        />

        <FeatureBlock
          index="05"
          title="毫不妥协的安全体系"
          description="内置速率限制 WAF、IP 封禁系统，重要端点自带 PoW 验证码，Server Action 代替 API 通信增强安全性。支持 Passkey、TOTP 双因素认证。"
          images={[
            { src: "/repo/admin/admin-16.webp", alt: "安全中心" },
            { src: "/repo/admin/admin-17.webp", alt: "审计日志" },
          ]}
        />
      </div>
    </section>
  );
}
