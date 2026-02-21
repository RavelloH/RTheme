"use client";

import Link from "next/link";
import { useReveal, useLineReveal } from "./use-gsap";
import { ArrowRight, Github } from "lucide-react";

export function CallToAction() {
  const lineRef = useLineReveal();
  const contentRef = useReveal({ y: 30, duration: 0.9 });

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <hr
          ref={lineRef}
          className="border-t border-fd-border mb-16 md:mb-20"
        />

        <div ref={contentRef} className="text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-fd-foreground tracking-tight leading-tight">
            以静态博客的成本
            <br />
            享受动态 CMS 的便利
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-fd-muted-foreground leading-relaxed">
            选择任意一种部署方式，即可完成部署并开始使用。完全开源、完全免费。
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/docs/deploy"
              className="group inline-flex items-center gap-2 bg-fd-foreground text-fd-background px-8 py-3 text-sm font-medium tracking-wide hover:opacity-80 transition-opacity"
            >
              开始部署
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/RavelloH/NeutralPress"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-fd-border px-8 py-3 text-sm font-medium tracking-wide text-fd-foreground hover:bg-fd-accent transition-colors"
            >
              <Github className="h-4 w-4" />
              查看源码
            </a>
          </div>
        </div>

        <div className="mt-24 border-t border-fd-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fd-muted-foreground tracking-wide">
          <span>NeutralPress &mdash; Open Source CMS</span>
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="hover:text-fd-foreground transition-colors"
            >
              文档
            </Link>
            <a
              href="https://ravelloh.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              演示
            </a>
            <a
              href="https://github.com/RavelloH/NeutralPress"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
