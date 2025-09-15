"use client";

import { useState, useRef, useEffect } from "react";
import { LoadingProgress } from "./LoadingProgress";
import { PageLoadManager } from "./PageLoadManager";

export function LoadingAnimation() {
  const [showLoading, setShowLoading] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [progressComplete, setProgressComplete] = useState(false);
  const hasTriggeredRef = useRef(false);

  const handlePageLoadComplete = () => {
    setPageLoaded(true);
  };

  const handleProgressComplete = () => {
    setProgressComplete(true);
  };

  // 监听两个状态，当都完成时触发动画
  useEffect(() => {
    if (pageLoaded && progressComplete && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      setShowLoading(false);
      
      // 触发所有组件的动画
      const event = new CustomEvent('loadingComplete');
      window.dispatchEvent(event);
    }
  }, [pageLoaded, progressComplete]);

  // 如果不显示加载界面，返回null
  if (!showLoading) {
    return null;
  }

  return (
    <>
      <PageLoadManager onLoadComplete={handlePageLoadComplete} />
      <LoadingProgress onComplete={handleProgressComplete} />
    </>
  );
}