"use client";

import { useReveal, useCounter, useLineReveal, useStagger } from "./use-gsap";

const stats = [
  { value: 115, suffix: "+", label: "React 组件" },
  { value: 56, suffix: "+", label: "服务端工具" },
  { value: 37, suffix: "+", label: "管理页面" },
  { value: 35, suffix: "", label: "数据模型" },
  { value: 33, suffix: "", label: "Server Actions" },
  { value: 25, suffix: "+", label: "页面区块" },
];

function StatItem({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const counterRef = useCounter(value, { suffix });
  return (
    <div className="py-6 md:py-8">
      <span
        ref={counterRef}
        className="block text-4xl md:text-5xl font-bold text-fd-foreground tracking-tight tabular-nums"
      >
        0
      </span>
      <span className="mt-2 block text-sm text-fd-muted-foreground tracking-wide">
        {label}
      </span>
    </div>
  );
}

export function Architecture() {
  const titleRef = useReveal({ y: 20 });
  const lineRef = useLineReveal();
  const techRef = useStagger({ staggerDelay: 0.08 });

  const techHighlights = [
    {
      title: "增量静态再生（ISR）",
      desc: "仅当内容变更时才重新生成页面，静态般的性能，动态般的灵活。",
    },
    {
      title: "0 成本部署",
      desc: "免费部署到 Vercel、Netlify 等 Serverless 平台，无需管理服务器。",
    },
    {
      title: "极致的媒体处理",
      desc: "图片上传自动转为avif节省空间、分发自动裁剪/转码，内置防盗链",
    },
    {
      title: "多存储后端",
      desc: "本地文件系统、AWS S3、Cloudflare R2、Vercel Blob、GitHub Pages，自由切换。",
    },
    {
      title: "100 % Typescript",
      desc: "从核心到插件，完全使用 TypeScript 编写，享受类型安全和现代开发体验。",
    },
    {
      title: "可随意编排的页面区块系统",
      desc: "基于区块进行渲染，可在布局编辑器中自由添加/调整/拖拽区块",
    },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <hr
          ref={lineRef}
          className="border-t border-fd-border mb-12 md:mb-16"
        />

        <div ref={titleRef} className="mb-16">
          <span className="text-xs tracking-[0.2em] uppercase text-fd-muted-foreground font-medium block mb-3">
            技术架构
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-fd-foreground tracking-tight">
            为现代 Web 而生
          </h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-t border-fd-border">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border-b border-r border-fd-border px-4"
            >
              <StatItem {...stat} />
            </div>
          ))}
        </div>

        {/* Tech highlights */}
        <div
          ref={techRef}
          className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-fd-border"
        >
          {techHighlights.map((item, i) => (
            <div
              key={item.title}
              className={`py-8 md:py-10 px-0 md:px-8 border-b border-fd-border ${
                i % 2 === 0 ? "md:border-r" : ""
              } ${i < 2 ? "" : ""}`}
            >
              <h3 className="text-lg font-semibold text-fd-foreground tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-fd-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
