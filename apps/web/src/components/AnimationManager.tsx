"use client";

import { useRef } from "react";
import { gsap } from "gsap";

interface AnimationManagerProps {
  onTrigger: () => void;
}

export function AnimationManager({ onTrigger }: AnimationManagerProps) {
  const hasTriggeredRef = useRef(false);

  const triggerAnimations = () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    // 触发Header动画
    const header = document.querySelector('header');
    if (header) {
      gsap.fromTo(header, 
        { y: -78 },
        { 
          y: 0, 
          duration: 0.8, 
          ease: "power2.out"
        }
      );
    }

    // 触发Footer动画
    const footer = document.querySelector('footer');
    if (footer) {
      gsap.fromTo(footer, 
        { y: 78 },
        { 
          y: 0, 
          duration: 0.8, 
          ease: "power2.out",
          delay: 0.2
        }
      );
    }

    // 触发Main动画
    const main = document.querySelector('main');
    if (main) {
      gsap.fromTo(main, 
        { x: "100%" },
        { 
          x: "0%", 
          duration: 0.8, 
          ease: "power2.out",
          delay: 0.4
        }
      );
    }

    onTrigger();
  };

  return { triggerAnimations };
}