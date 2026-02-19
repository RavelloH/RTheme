"use client";

import { useMemo } from "react";
import type { StatItem } from "@repo/shared-types";

import DimensionStatsChart from "@/components/client/charts/DimensionStatsChart";
import { GridItem } from "@/components/client/layout/RowGrid";
import { useMainColor } from "@/components/client/layout/ThemeProvider";
import generateComplementary from "@/lib/shared/complementary";
import generateGradient from "@/lib/shared/gradient";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

interface DimensionStatsProps {
  title: string;
  items: StatItem[] | null;
  mainColor?: string; // 改为可选
  position: "up" | "middle" | "down";
  enableQuickFilter?: boolean;
  quickFilterField?: string;
  onQuickFilter?: (field: string, value: string) => void;
  activeFilterValue?: string;
}

export default function DimensionStats({
  title,
  items,
  mainColor: mainColorProp,
  position,
  enableQuickFilter = false,
  quickFilterField,
  onQuickFilter,
  activeFilterValue,
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

  const isQuickFilterEnabled =
    enableQuickFilter && !!quickFilterField && !!onQuickFilter;

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
              enableFilter={isQuickFilterEnabled}
              onItemClick={
                isQuickFilterEnabled
                  ? (value) => onQuickFilter(quickFilterField, value)
                  : undefined
              }
              activeItemName={
                isQuickFilterEnabled ? activeFilterValue : undefined
              }
            />
          </div>
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </GridItem>
  );
}
