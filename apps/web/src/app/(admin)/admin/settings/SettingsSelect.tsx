"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { useBroadcastSender } from "@/hooks/useBroadcast";
import { useState, useEffect } from "react";

const settings = [
  {
    name: "站点信息",
    key: "site",
  },
  {
    name: "SEO配置",
    key: "seo",
  },
  {
    name: "用户策略",
    key: "user",
  },
  {
    name: "内容策略",
    key: "content",
  },
  {
    name: "媒体策略",
    key: "media",
  },
  {
    name: "媒体策略",
    key: "media",
  },
  {
    name: "媒体策略",
    key: "media",
  },
  {
    name: "媒体策略",
    key: "media",
  },
];

export interface SettingSelectMessage {
  type: "setting-select";
  category: string;
}

export default function SettingSelect() {
  const [selectedKey, setSelectedKey] = useState<string>("site"); // 默认选择站点信息
  const { broadcast } = useBroadcastSender<SettingSelectMessage>();

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    broadcast({
      type: "setting-select",
      category: key,
    });
  };

  // 初始加载时自动发送站点信息的广播
  useEffect(() => {
    broadcast({
      type: "setting-select",
      category: "site",
    });
  }, []);

  return (
    <GridItem areas={[5, 6, 7, 8, 9, 10, 11, 12]} width={1.5} height={0.5}>
      <AutoTransition type="scale" className="h-full">
        <div className="w-full h-full grid grid-cols-2 text-2xl" key="content">
          {settings.map((setting) => (
            <div
              key={setting.key}
              className={`border-border border flex items-center justify-center hover:bg-accent cursor-pointer transition-all ${
                selectedKey === setting.key
                  ? "bg-primary hover:bg-primary text-primary-foreground"
                  : ""
              }`}
              onClick={() => handleSelect(setting.key)}
            >
              {setting.name}
            </div>
          ))}
        </div>
      </AutoTransition>
    </GridItem>
  );
}
