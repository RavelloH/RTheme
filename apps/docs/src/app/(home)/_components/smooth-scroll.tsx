"use client";

import { type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function ScrollTriggerSync() {
  useLenis(() => {
    ScrollTrigger.update();
  });
  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        duration: 1.4,
        smoothWheel: true,
        syncTouch: false,
      }}
    >
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
