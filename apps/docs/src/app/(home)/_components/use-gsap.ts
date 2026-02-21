"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useReveal(options?: {
  y?: number;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    gsap.set(el, { opacity: 0, y: options?.y ?? 40 });
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: options?.duration ?? 0.8,
          delay: options?.delay ?? 0,
          ease: "power3.out",
        });
      },
    });
    return () => trigger.kill();
  }, [options?.y, options?.delay, options?.duration]);
  return ref;
}

export function useStagger(options?: { staggerDelay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const children = ref.current.children;
    if (!children.length) return;
    gsap.set(children, { opacity: 0, y: options?.y ?? 30 });
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(children, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: options?.staggerDelay ?? 0.1,
          ease: "power3.out",
        });
      },
    });
    return () => trigger.kill();
  }, [options?.staggerDelay, options?.y]);
  return ref;
}

export function useParallax(speed: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        if (ref.current) {
          gsap.set(ref.current, { y: self.progress * 100 * speed * -1 });
        }
      },
    });
    return () => trigger.kill();
  }, [speed]);
  return ref;
}

export function useLineReveal() {
  const ref = useRef<HTMLHRElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.set(ref.current, { scaleX: 0, transformOrigin: "center" });
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(ref.current, {
          scaleX: 1,
          duration: 1,
          ease: "power2.inOut",
        });
      },
    });
    return () => trigger.kill();
  }, []);
  return ref;
}

export function useCounter(
  target: number,
  options?: { duration?: number; suffix?: string },
) {
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = "0" + (options?.suffix ?? "");
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 90%",
      once: true,
      onEnter: () => {
        if (triggered.current) return;
        triggered.current = true;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: options?.duration ?? 1.5,
          ease: "power2.out",
          onUpdate: () => {
            if (ref.current) {
              ref.current.textContent =
                Math.round(obj.val) + (options?.suffix ?? "");
            }
          },
        });
      },
    });
    return () => trigger.kill();
  }, [target, options?.duration, options?.suffix]);
  return ref;
}

export function useImageReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    gsap.set(el, { opacity: 0, scale: 0.96 });
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
        });
      },
    });
    return () => trigger.kill();
  }, []);
  return ref;
}

export function useHorizontalScroll() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const MD_BREAKPOINT = 768;
    let st: ScrollTrigger | null = null;

    // Horizontal scroll starts when section top reaches 10% from viewport top.
    // sticky CSS must match: top-[10vh].
    const STICKY_RATIO = 0.1; // 10% from top

    const setup = () => {
      // Skip GSAP horizontal scroll on mobile
      if (window.innerWidth < MD_BREAKPOINT) return;

      const totalWidth = track.scrollWidth;
      // Use the overflow-hidden parent as the visible viewport, not window
      const clipParent = track.parentElement;
      const viewWidth = clipParent ? clipParent.offsetWidth : window.innerWidth;
      const distance = totalWidth - viewWidth;
      if (distance <= 0) return;

      const vh = window.innerHeight;
      // ScrollTrigger range = sectionHeight - vh * (1 - STICKY_RATIO)
      // We need this range = distance
      // => sectionHeight = distance + vh * (1 - STICKY_RATIO)
      section.style.height = `${distance + vh * (1 - STICKY_RATIO)}px`;

      st = ScrollTrigger.create({
        trigger: section,
        start: `top ${STICKY_RATIO * 100}%`,
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        animation: gsap.to(track, { x: -distance, ease: "none" }),
      });
    };

    const rafId = requestAnimationFrame(() => {
      setup();
      ScrollTrigger.refresh();
    });

    const onResize = () => {
      if (st) st.kill();
      st = null;
      section.style.height = "";
      gsap.set(track, { x: 0 });
      setup();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      if (st) st.kill();
      if (section) section.style.height = "";
      gsap.set(track, { clearProps: "x" });
    };
  }, []);

  return { sectionRef, trackRef };
}

export function useParallaxPair() {
  const fastRef = useRef<HTMLDivElement>(null);
  const slowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fastRef.current || !slowRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(fastRef.current, {
        y: -60,
        ease: "none",
        scrollTrigger: {
          trigger: fastRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(slowRef.current, {
        y: -20,
        ease: "none",
        scrollTrigger: {
          trigger: slowRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
    return () => ctx.revert();
  }, []);

  return { fastRef, slowRef };
}

export function refreshScrollTrigger() {
  ScrollTrigger.refresh();
}
