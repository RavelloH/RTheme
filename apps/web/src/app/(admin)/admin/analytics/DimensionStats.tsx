"use client";

import { useMemo } from "react";
import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import type { StatItem } from "@repo/shared-types";
import DimensionStatsChart from "@/components/DimensionStatsChart";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";
import { useMainColor } from "@/components/ThemeProvider";

interface DimensionStatsProps {
  title: string;
  items: StatItem[] | null;
  mainColor?: string; // 改为可选
  position: "up" | "middle" | "down";
}

export default function DimensionStats({
  title,
  items,
  mainColor: mainColorProp,
  position,
}: DimensionStatsProps) {
  const themeColor = useMainColor(); // 从 ThemeProvider 获取主题颜色

  // 显示所有数据（移除 10 项限制）
  const displayItems = items;

  // 生成颜色 - 如果未传入 mainColor，使用主题颜色
  const colors = useMemo(() => {
    if (!displayItems) return [];

    try {
      const primaryColor = mainColorProp || themeColor.primary || "#2dd4bf";
      const complementaryColor = generateComplementary(primaryColor);
      return generateGradient(
        primaryColor,
        complementaryColor,
        Math.max(displayItems.length, 2),
      );
    } catch (error) {
      console.error("Failed to generate colors:", error);
      // 降级到默认颜色
      return ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];
    }
  }, [displayItems, mainColorProp, themeColor.primary]);

  return (
    <GridItem
      areas={
        position === "up"
          ? [1, 2, 3, 4]
          : position === "middle"
            ? [5, 6, 7, 8]
            : [9, 10, 11, 12]
      }
      width={3}
      height={0.5}
    >
      <AutoTransition type="slideUp" className="h-full">
        {displayItems ? (
          <div key="content" className="flex flex-col h-full p-10">
            <DimensionStatsChart
              title={title}
              items={displayItems}
              colors={colors}
            />
          </div>
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </GridItem>
  );
}
