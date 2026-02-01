"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useNavigateWithTransition } from "@/components/ui/Link";

export default function BackLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [referer, setReferer] = useState<string | null>(null);
  const navigate = useNavigateWithTransition();

  useEffect(() => {
    setReferer(document.referrer);
  }, []);

  const handleClick = () => {
    // 优先尝试浏览器历史后退（更准确地返回上一页），
    // 如果没有历史记录，再使用 document.referrer 作为回退，
    // 最后退回首页。
    if (window.history.length > 1) {
      router.back();
    } else if (referer) {
      navigate(referer);
    } else {
      navigate("/");
    }
  };

  return (
    <div className={"cursor-pointer " + className} onClick={handleClick}>
      {children}
    </div>
  );
}
