"use client";

import React, { useEffect, useRef, useState } from "react";
import { RiSearch2Line } from "@remixicon/react";

import { useBroadcastSender } from "@/hooks/use-broadcast";
import { Input } from "@/ui/Input";

interface SearchMessage {
  query: string;
}

export default function SearchInput() {
  const [inputValue, setInputValue] = useState("");
  const { broadcast } = useBroadcastSender<SearchMessage>();
  const hasInteracted = useRef(false);

  // 防抖处理
  useEffect(() => {
    // 跳过初始的空字符串广播
    if (!hasInteracted.current) {
      if (inputValue !== "") {
        hasInteracted.current = true;
      } else {
        return;
      }
    }

    const timer = setTimeout(() => {
      broadcast({ query: inputValue });
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, broadcast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setInputValue(e.target.value);
  };

  return (
    <Input
      label="搜索全站文章..."
      icon={<RiSearch2Line size={"1em"} />}
      value={inputValue}
      maxLength={200}
      onChange={handleChange}
    />
  );
}
