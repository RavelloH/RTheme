// @/hooks/useMobile.ts
import { useState, useEffect } from "react";

/**
 * React Hook for detecting if the current device is a mobile device
 * @returns boolean - true if the device is mobile, false otherwise
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = (): boolean => {
      // Check if the device is mobile based on user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent,
        );

      // Additional check for touch support and screen width
      const hasTouchSupport =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;

      return isMobileDevice || (hasTouchSupport && isSmallScreen);
    };

    // Set initial value
    setIsMobile(checkIsMobile());

    // Handle window resize
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    // Add event listener for resize
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}

/**
 * Alternative version with customizable breakpoint
 * @param breakpoint - The screen width breakpoint in pixels (default: 768)
 * @returns boolean - true if the device width is less than the breakpoint
 */
export function useBreakpoint(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkBreakpoint = (): boolean => {
      return window.innerWidth <= breakpoint;
    };

    // Set initial value
    setIsMobile(checkBreakpoint());

    // Handle window resize
    const handleResize = () => {
      setIsMobile(checkBreakpoint());
    };

    // Add event listener for resize
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}
