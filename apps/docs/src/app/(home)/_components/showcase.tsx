"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useReveal,
  useLineReveal,
  useStagger,
  useHorizontalScroll,
} from "./use-gsap";

/* ── 通用图片组件 ── */
function Img({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`border border-fd-border overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={1920}
        height={1080}
        className="w-full h-auto"
      />
    </div>
  );
}

/* ── 横向滚动条（含标题） ── */
function HorizontalStrip({
  index,
  title,
  desc,
  images,
}: {
  index: string;
  title: string;
  desc: string;
  images: { src: string; alt: string }[];
}) {
  const { sectionRef, trackRef } = useHorizontalScroll();
  const headerRef = useReveal({ y: 20 });

  /* ── Mobile carousel state ── */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scrollBy = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth =
      el.querySelector<HTMLElement>(":scope > div")?.offsetWidth ??
      el.clientWidth * 0.85;
    el.scrollBy({ left: direction * (cardWidth + 16), behavior: "smooth" });
  }, []);

  return (
    <div ref={sectionRef} className="relative">
      <div className="md:sticky md:top-[10vh] mx-auto max-w-7xl px-6">
        <div ref={headerRef} className="mb-6 md:mb-8">
          <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium block mb-2">
            {index}
          </span>
          <h3 className="text-xl md:text-2xl font-bold text-fd-foreground tracking-tight">
            {title}
          </h3>
          <p className="mt-2 text-sm text-fd-muted-foreground max-w-2xl leading-relaxed">
            {desc}
          </p>
        </div>

        {/* ── Desktop: GSAP horizontal scroll ── */}
        <div className="relative hidden md:block overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-fd-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-fd-background to-transparent" />
          <div ref={trackRef} className="flex gap-4 w-max py-2">
            {images.map((img) => (
              <div
                key={img.src}
                className="shrink-0 w-[65vw] border border-fd-border overflow-hidden"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={1920}
                  height={1080}
                  className="w-full h-auto"
                />
                <div className="px-4 py-2.5 border-t border-fd-border">
                  <span className="text-xs text-fd-muted-foreground tracking-wide">
                    {img.alt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile: scroll-snap carousel with buttons ── */}
        <div className="relative md:hidden">
          {/* Nav buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scrollBy(-1)}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-fd-border bg-fd-background/80 backdrop-blur-sm text-fd-foreground shadow-sm active:scale-95 transition-transform"
              aria-label="上一张"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scrollBy(1)}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-fd-border bg-fd-background/80 backdrop-blur-sm text-fd-foreground shadow-sm active:scale-95 transition-transform"
              aria-label="下一张"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Scrollable track */}
          <div
            ref={scrollRef}
            className="-mx-6 px-6 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((img) => (
              <div
                key={img.src}
                className="shrink-0 w-[85vw] snap-center border border-fd-border overflow-hidden"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={1920}
                  height={1080}
                  className="w-full h-auto"
                />
                <div className="px-4 py-2.5 border-t border-fd-border">
                  <span className="text-xs text-fd-muted-foreground tracking-wide">
                    {img.alt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 左右分栏：左文字 + 右图片堆叠 ── */
function SplitSection({
  index,
  title,
  desc,
  images,
}: {
  index: string;
  title: string;
  desc: string;
  images: { src: string; alt: string }[];
}) {
  const textRef = useReveal({ y: 20 });
  const imgRef = useStagger({ staggerDelay: 0.15, y: 40 });
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
      <div ref={textRef} className="md:col-span-4">
        <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium block mb-2">
          {index}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-fd-foreground tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-sm text-fd-muted-foreground leading-relaxed">
          {desc}
        </p>
      </div>
      <div ref={imgRef} className="md:col-span-7">
        {images.map((img, i) => (
          <div
            key={img.src}
            className={`relative ${i > 0 ? "mt-4 md:-mt-28" : ""}`}
            style={{ zIndex: i + 1 }}
          >
            <div
              style={{ "--stack-x": `${-i * 15}%` } as React.CSSProperties}
              className="md:[transform:translateX(var(--stack-x))]"
            >
              <Img src={img.src} alt={img.alt} className="shadow-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   前台展示
   ═══════════════════════════════════════════ */
export function FrontShowcase() {
  const lineRef = useLineReveal();
  const titleRef = useReveal({ y: 20 });

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <hr
          ref={lineRef}
          className="border-t border-fd-border mb-12 md:mb-16"
        />
        <div ref={titleRef} className="mb-16">
          <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium block mb-3">
            前台展示
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-fd-foreground tracking-tight">
            访客看到的世界
          </h2>
          <p className="mt-3 text-fd-muted-foreground max-w-xl">
            默认主题融合国际平面主义与新粗野主义，在保持简洁的同时呈现独特的视觉风格。
          </p>
        </div>
      </div>

      {/* 01 ─ 内容浏览：横向滚动 */}
      <HorizontalStrip
        index="01"
        title="内容浏览"
        desc="主页画廊、文章列表、文章正文、图片灯箱，沉浸式的阅读体验。"
        images={[
          { src: "/repo/front/front-1.webp", alt: "主页画廊" },
          { src: "/repo/front/front-3.webp", alt: "最近文章" },
          { src: "/repo/front/front-11.webp", alt: "文章封面" },
          { src: "/repo/front/front-12.webp", alt: "文章正文" },
          { src: "/repo/front/front-13.webp", alt: "图片灯箱效果" },
        ]}
      />

      {/* 02 ─ 搜索与发现 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="02"
          title="搜索与发现"
          desc="高性能分词搜索，支持文章搜索与全站搜索，配合标签墙和归档列表快速定位内容。"
          images={[
            { src: "/repo/front/front-4.webp", alt: "文章搜索" },
            { src: "/repo/front/front-5.webp", alt: "全站搜索" },
            { src: "/repo/front/front-8.webp", alt: "归档列表" },
            { src: "/repo/front/front-20.webp", alt: "标签墙" },
          ]}
        />
      </div>

      {/* 03 ─ 项目与社区 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="03"
          title="项目与社区"
          desc="作品系统、友情链接、项目展示，专为个人品牌设计的多维度展示。"
          images={[
            { src: "/repo/front/front-2.webp", alt: "项目页面" },
            { src: "/repo/front/front-6.webp", alt: "项目列表" },
            { src: "/repo/front/front-7.webp", alt: "友情链接" },
          ]}
        />
      </div>

      {/* 04 ─ 媒体展示 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="04"
          title="媒体展示"
          desc="照片墙与详情页，支持 Exif 信息展示，为摄影爱好者打造。"
          images={[
            { src: "/repo/front/front-9.webp", alt: "照片墙" },
            { src: "/repo/front/front-10.webp", alt: "照片详情" },
          ]}
        />
      </div>

      {/* 05 ─ 社交互动 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="05"
          title="社交互动"
          desc="个人主页、私信功能、多方式登录，构建你自己的社区。"
          images={[
            { src: "/repo/front/front-14.webp", alt: "个人主页" },
            { src: "/repo/front/front-15.webp", alt: "私信功能" },
            { src: "/repo/front/front-21.webp", alt: "登录页面" },
          ]}
        />
      </div>

      {/* 06 ─ 区块与自定义页面：横向滚动 */}
      <div className="mt-24 md:mt-32">
        <HorizontalStrip
          index="06"
          title="区块与自定义"
          desc="链接墙、用户评价、时间线等丰富区块，配合全站菜单自由编排。"
          images={[
            {
              src: "/repo/front/front-16.webp",
              alt: "区块展示（链接墙、引用）",
            },
            { src: "/repo/front/front-17.webp", alt: "区块展示（用户评价）" },
            { src: "/repo/front/front-18.webp", alt: "区块展示（时间线）" },
            { src: "/repo/front/front-19.webp", alt: "全站菜单" },
          ]}
        />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   后台管理
   ═══════════════════════════════════════════ */
export function AdminShowcase() {
  const lineRef = useLineReveal();
  const titleRef = useReveal({ y: 20 });

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <hr
          ref={lineRef}
          className="border-t border-fd-border mb-12 md:mb-16"
        />
        <div ref={titleRef} className="mb-16">
          <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium block mb-3">
            后台管理
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-fd-foreground tracking-tight">
            站长掌控的一切
          </h2>
          <p className="mt-3 text-fd-muted-foreground max-w-xl">
            前后台保持完全统一的设计风格，所有管理操作一目了然。
          </p>
        </div>
      </div>

      {/* 01 ─ 运营概览 */}
      <div className="mx-auto max-w-7xl px-6">
        <SplitSection
          index="01"
          title="运营概览"
          desc="仪表盘一览全站运行状态、用户、文章、评论、访问量，系统信息实时监控。"
          images={[
            { src: "/repo/admin/admin-1.webp", alt: "仪表盘" },
            { src: "/repo/admin/admin-20.webp", alt: "系统信息仪表" },
          ]}
        />
      </div>

      {/* 02 ─ 内容创作：横向滚动 */}
      <div className="mt-24 md:mt-32">
        <HorizontalStrip
          index="02"
          title="内容创作"
          desc="文章管理列表、所见即所得编辑器、Markdown 编辑器，三合一编辑体验。"
          images={[
            { src: "/repo/admin/admin-2.webp", alt: "文章管理列表" },
            { src: "/repo/admin/admin-3.webp", alt: "文章所见即所得编辑器" },
            { src: "/repo/admin/admin-4.webp", alt: "文章 Markdown 编辑器" },
          ]}
        />
      </div>

      {/* 03 ─ 页面构建 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="03"
          title="页面构建"
          desc="拖拽式区块编辑器，从区块库中选取组件自由搭建页面。"
          images={[
            { src: "/repo/admin/admin-13.webp", alt: "区块编辑器" },
            { src: "/repo/admin/admin-14.webp", alt: "区块编辑器（正在拖拽）" },
            { src: "/repo/admin/admin-15.webp", alt: "区块库列表" },
          ]}
        />
      </div>

      {/* 04 ─ 数据洞察 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="04"
          title="数据洞察"
          desc="访问分析总览与来源追踪，全站词云与文章索引，用数据驱动内容策略。"
          images={[
            { src: "/repo/admin/admin-5.webp", alt: "访问分析页面（总览）" },
            { src: "/repo/admin/admin-6.webp", alt: "访问分析页面（来源）" },
            { src: "/repo/admin/admin-12.webp", alt: "全站词云 + 文章索引" },
          ]}
        />
      </div>

      {/* 05 ─ 资源管理 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="05"
          title="资源管理"
          desc="媒体文件网格与列表双视图，支持自动压缩与图片优化。"
          images={[
            { src: "/repo/admin/admin-8.webp", alt: "媒体文件管理（网格）" },
            { src: "/repo/admin/admin-19.webp", alt: "媒体文件管理（列表）" },
          ]}
        />
      </div>

      {/* 06 ─ 社区管理：横向滚动 */}
      <div className="mt-24 md:mt-32">
        <HorizontalStrip
          index="06"
          title="社区管理"
          desc="评论审核、标签管理、项目管理、友链监控、用户管理，社区运营的全套工具。"
          images={[
            { src: "/repo/admin/admin-7.webp", alt: "评论详情页面" },
            { src: "/repo/admin/admin-9.webp", alt: "标签管理" },
            { src: "/repo/admin/admin-10.webp", alt: "项目管理" },
            { src: "/repo/admin/admin-11.webp", alt: "友链监控功能" },
            { src: "/repo/admin/admin-21.webp", alt: "用户管理列表" },
          ]}
        />
      </div>

      {/* 07 ─ 安全与配置 */}
      <div className="mx-auto max-w-7xl px-6 mt-24 md:mt-32">
        <SplitSection
          index="07"
          title="安全与配置"
          desc="安全中心、审计日志、站点设置，每一次操作可追溯、可还原。"
          images={[
            { src: "/repo/admin/admin-16.webp", alt: "安全中心" },
            { src: "/repo/admin/admin-17.webp", alt: "审计日志" },
            { src: "/repo/admin/admin-18.webp", alt: "站点设置" },
          ]}
        />
      </div>
    </section>
  );
}
