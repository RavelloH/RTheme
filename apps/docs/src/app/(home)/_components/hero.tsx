"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ArrowRight, Github, ExternalLink } from "lucide-react";

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.set(
      [titleRef.current, subtitleRef.current, ctaRef.current, badgeRef.current],
      {
        opacity: 0,
        y: 30,
      },
    );
    tl.set(imageRef.current, { opacity: 0, y: 50, scale: 0.97 });

    tl.to(badgeRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.1)
      .to(titleRef.current, { opacity: 1, y: 0, duration: 0.7 }, 0.2)
      .to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.4)
      .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.5)
      .to(imageRef.current, { opacity: 1, y: 0, scale: 1, duration: 1 }, 0.6);
  }, []);

  return (
    <section className="relative pt-16 pb-0 md:pt-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Badge */}
        <div ref={badgeRef} className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 border border-fd-border px-4 py-1.5 text-xs tracking-widest uppercase text-fd-muted-foreground">
            Open Source CMS
            <span className="inline-block w-1 h-1 rounded-full bg-fd-muted-foreground" />
            Next.js 16
          </span>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="text-center text-4xl font-semibold tracking-wide text-fd-foreground sm:text-5xl md:text-6xl lg:text-8xl leading-[1.08] mb-10"
        >
          NeutralPress
        </h1>
        <h2 className="text-center text-3xl tracking-tight text-fd-foreground sm:text-4xl md:text-6xl lg:text-6xl leading-[1.08]">
          下一代内容管理系统
        </h2>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="mx-auto mt-6 max-w-2xl text-center text-base md:text-lg text-fd-muted-foreground leading-relaxed"
        >
          以静态博客的成本，享受动态 CMS 的便利。
          <br className="hidden sm:block" />
          基于 Next.js 构建，0 成本免费部署到任何 Serverless 平台。
        </p>

        {/* CTAs */}
        <div
          ref={ctaRef}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/docs"
            className="group inline-flex items-center gap-2 bg-fd-foreground text-fd-background px-6 py-2.5 text-sm font-medium tracking-wide hover:opacity-80 transition-opacity"
          >
            开始使用
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://ravelloh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 border border-fd-border px-6 py-2.5 text-sm font-medium tracking-wide text-fd-foreground hover:bg-fd-accent transition-colors"
          >
            在线演示
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </a>
          <a
            href="https://github.com/RavelloH/NeutralPress"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-fd-border text-sm font-medium tracking-wide text-fd-foreground hover:bg-fd-accent hover:text-fd-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>

        {/* Hero Image */}
        <div ref={imageRef} className="relative mt-16 md:mt-20">
          <div className="relative overflow-hidden border-2 border-fd-border rounded-md">
            <Image
              src="/repo/admin/admin-3.webp"
              alt="NeutralPress 编辑器"
              width={1920}
              height={1080}
              className="w-full h-auto"
              priority
            />
          </div>
          {/* Gradient fade at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-fd-background to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
