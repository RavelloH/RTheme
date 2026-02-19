"use client";

import type { PathStat } from "@repo/shared-types";

import { GridItem } from "@/components/client/layout/RowGrid";
import generateComplementary from "@/lib/shared/complementary";
import generateGradient from "@/lib/shared/gradient";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

interface PathStatsChartProps {
  paths: PathStat[] | null;
  mainColor: string;
  onPathClick?: (path: string) => void;
  activePath?: string;
}

export default function PathStatsChart({
  paths,
  mainColor,
  onPathClick,
  activePath,
}: PathStatsChartProps) {
  // 生成循环滚动渐变色（1 2 3 2 1 2 3 ...）
  const colors = (() => {
    if (!paths) return [];
    const gradient = generateGradient(
      mainColor,
      generateComplementary(mainColor),
      Math.max(Math.ceil(paths.length / 2), 5),
    );
    // 构建循环滚动色：正向 + 反向（去掉首尾避免重复）+ 正向 ...
    const forward = [...gradient];
    const backward = gradient.slice(1, -1).reverse();
    const cycle = [...forward, ...backward];
    return cycle;
  })();

  const getBarColor = (index: number) => {
    return colors[index % colors.length] || mainColor;
  };

  return (
    <GridItem
      areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
      width={1}
      height={0.8}
    >
      <AutoTransition type="slideUp" className="h-full">
        {paths ? (
          <div key="content" className="flex flex-col h-full p-10">
            <div className="text-2xl mb-4">访问路径</div>

            {paths.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                暂无路径统计数据
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-3">
                  {paths.map((path, index) => (
                    <Clickable
                      hoverScale={1}
                      key={path.path}
                      onClick={() => onPathClick?.(path.path)}
                      disabled={!onPathClick}
                      className={`flex items-center gap-4 rounded-sm px-2 py-1 transition-colors ${
                        activePath === path.path
                          ? "text-primary bg-primary/20"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="w-64 truncate text-sm" title={path.path}>
                        {path.path}
                      </div>
                      <div className="flex-1 h-6 bg-muted/50 rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-300"
                          style={{
                            width: `${Math.max(path.percentage, 1)}%`,
                            backgroundColor: getBarColor(index),
                          }}
                        />
                      </div>
                      <div className="w-20 text-right text-sm">
                        {path.count}
                      </div>
                      <div className="w-16 text-right text-sm text-muted-foreground">
                        {path.percentage.toFixed(1)}%
                      </div>
                    </Clickable>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </GridItem>
  );
}
