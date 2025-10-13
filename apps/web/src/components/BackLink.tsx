"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useNavigateWithTransition } from "@/components/Link";

export default function BackLink({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [referer, setReferer] = useState<string | null>(null);
  const navigate = useNavigateWithTransition();

  useEffect(() => {
    setReferer(document.referrer);
  }, []);

  const handleClick = () => {
    if (referer) {
      navigate(referer);
    } else if (window.history.length > 1) {
      router.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="cursor-pointer" onClick={handleClick}>
      {children}
    </div>
  );
}
