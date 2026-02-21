"use client";

import { useReveal, useLineReveal } from "./use-gsap";

export function Philosophy() {
  const lineTopRef = useLineReveal();
  const lineBottomRef = useLineReveal();
  const textRef = useReveal({ y: 30, duration: 1 });

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <hr ref={lineTopRef} className="border-t border-fd-border mb-16" />
        <div ref={textRef}>
          <p className="text-center text-2xl md:text-3xl lg:text-4xl font-light leading-snug text-fd-foreground tracking-tight">
            保持中性，将情绪留给内容本身。
          </p>
          <p className="mt-6 text-center text-base md:text-lg text-fd-muted-foreground leading-relaxed">
            <span className="font-medium text-fd-foreground">Neutral</span>
            ，意为"中性"，象征着简洁与纯粹。
            <br />
            不仅仅是一个内容管理系统，也是你的私人社区、数字门户、个人知识库。
          </p>
        </div>
        <hr ref={lineBottomRef} className="border-t border-fd-border mt-16" />
      </div>
    </section>
  );
}
