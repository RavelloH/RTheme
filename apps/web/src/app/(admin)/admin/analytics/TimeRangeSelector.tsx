"use client";

import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCalendarLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/ui/Button";
import Clickable from "@/ui/Clickable";
import { Input } from "@/ui/Input";

export type TimeRangeValue =
  | { type: "preset"; days: number }
  | { type: "hours"; hours: number }
  | { type: "custom"; startDate: string; endDate: string };

interface TimeRangeSelectorProps {
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
}

interface TimeRangeOption {
  label: string;
  value: number;
  description?: string;
  mode?: "days" | "hours"; // 新增：区分天数模式和小时模式
}

interface TimeRangeGroup {
  title: string;
  options: TimeRangeOption[];
}

const timeRangeGroups: TimeRangeGroup[] = [
  {
    title: "本周",
    options: [
      {
        label: "最近 24 小时",
        value: 24,
        mode: "hours",
      },
      { label: "最近 7 天", value: 7, mode: "days" },
    ],
  },
  {
    title: "本月",
    options: [
      { label: "最近 30 天", value: 30, mode: "days" },
      { label: "最近 90 天", value: 90, mode: "days" },
    ],
  },
  {
    title: "今年",
    options: [
      { label: "最近 6 个月", value: 180, mode: "days" },
      { label: "最近 12 个月", value: 365, mode: "days" },
    ],
  },
  {
    title: "所有时间",
    options: [{ label: "所有数据", value: 999, mode: "days" }],
  },
];

export default function TimeRangeSelector({
  value,
  onChange,
}: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowCustom(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 获取当前显示的标签
  const getDisplayLabel = () => {
    if (value.type === "custom") {
      return `${value.startDate} ~ ${value.endDate}`;
    }

    if (value.type === "hours") {
      return `最近 ${value.hours} 小时`;
    }

    // 查找对应的预设选项
    for (const group of timeRangeGroups) {
      const option = group.options.find(
        (opt) => opt.mode === "days" && opt.value === value.days,
      );
      if (option) {
        return option.label;
      }
    }

    return `最近 ${value.days} 天`;
  };

  const handlePresetClick = (option: TimeRangeOption) => {
    if (option.mode === "hours") {
      onChange({ type: "hours", hours: option.value });
    } else {
      onChange({ type: "preset", days: option.value });
    }
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomSubmit = () => {
    if (customStartDate && customEndDate) {
      onChange({
        type: "custom",
        startDate: customStartDate,
        endDate: customEndDate,
      });
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 触发按钮 */}
      <Clickable
        hoverScale={1}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-sm border border-foreground/10 hover:border-foreground/20 transition-colors bg-background"
      >
        <RiCalendarLine size="1em" className="text-muted-foreground" />
        <span className="text-sm font-medium">{getDisplayLabel()}</span>
        <RiArrowDownSLine
          size="1em"
          className={`text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Clickable>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-background border border-foreground/10 rounded-sm shadow-lg z-50 overflow-hidden"
          >
            {!showCustom ? (
              <div className="py-2">
                {timeRangeGroups.map((group, groupIndex) => (
                  <div key={group.title}>
                    {/* 分组标题 */}
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                      {group.title}
                    </div>

                    {/* 选项列表 */}
                    {group.options.map((option) => {
                      const isSelected =
                        (value.type === "preset" &&
                          option.mode === "days" &&
                          value.days === option.value) ||
                        (value.type === "hours" &&
                          option.mode === "hours" &&
                          value.hours === option.value);

                      return (
                        <Clickable
                          hoverScale={1}
                          key={`${option.mode}-${option.value}`}
                          onClick={() => handlePresetClick(option)}
                          className={`w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors ${
                            isSelected
                              ? "bg-muted text-primary font-medium"
                              : ""
                          }`}
                        >
                          <div className="text-sm">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          )}
                        </Clickable>
                      );
                    })}

                    {/* 分组分隔线 */}
                    {groupIndex < timeRangeGroups.length - 1 && (
                      <div className="my-2 border-t border-foreground/5" />
                    )}
                  </div>
                ))}

                {/* 自定义时间段按钮 */}
                <div className="mt-2 border-t border-foreground/5" />
                <Clickable
                  hoverScale={1}
                  onClick={() => setShowCustom(true)}
                  className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="text-sm font-medium">自定义时间段</div>
                  <div className="text-xs text-muted-foreground">
                    选择特定日期范围
                  </div>
                </Clickable>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="text-sm font-semibold">自定义时间段</div>

                <div className="space-y-2">
                  <Input
                    label="开始日期"
                    type="date"
                    size="sm"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    label="结束日期"
                    size="sm"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    label="取消"
                    onClick={() => setShowCustom(false)}
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                  />
                  <Button
                    label="确定"
                    onClick={handleCustomSubmit}
                    size="sm"
                    className="flex-1"
                    disabled={!customStartDate || !customEndDate}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
