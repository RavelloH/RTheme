"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiFilterLine,
  RiSearchLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import type { GridArea } from "@/components/client/layout/RowGrid";
import { GridItem } from "@/components/client/layout/RowGrid";
import { useMobile } from "@/hooks/use-mobile";
import { createArray } from "@/lib/client/create-array";
import { AutoTransition } from "@/ui/AutoTransition";
import type { ButtonProps } from "@/ui/Button";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import Clickable from "@/ui/Clickable";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import type { SelectOption } from "@/ui/Select";
import { Select } from "@/ui/Select";
import type { TableColumn } from "@/ui/Table";
import { Table } from "@/ui/Table";
import { Tooltip } from "@/ui/Tooltip";

// 操作按钮配置
export interface ActionButton {
  label: string; // 按钮标签，用于批量操作按钮文字和行操作的 tooltip
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
  loading?: boolean;
}

// 筛选配置
export interface FilterConfig {
  key: string; // 筛选字段的 key，对应 URL 参数名
  label: string; // 显示标签
  type: "checkboxGroup" | "input" | "dateRange" | "range"; // 筛选类型
  options?: SelectOption[]; // checkboxGroup 类型时的选项
  placeholder?: string; // input 类型的占位符
  inputType?: "text" | "number"; // input 的具体类型
  dateFields?: { start: string; end: string }; // dateRange 类型时的字段名
  rangeFields?: { min: string; max: string }; // range 类型时的字段名
  placeholderMin?: string; // range 类型最小值占位符
  placeholderMax?: string; // range 类型最大值占位符
}

export interface GridTableProps<T extends Record<string, unknown>> {
  title: React.ReactNode;
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  rowKey: keyof T | ((record: T) => string | number);
  // 分页相关
  page: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  // 排序相关
  onSortChange?: (key: string, order: "asc" | "desc" | null) => void;
  // 搜索相关
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  // 筛选相关
  filterConfig?: FilterConfig[]; // 筛选字段配置
  onFilterChange?: (
    filters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    >,
  ) => void; // 筛选回调
  // 表格配置
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  size?: "sm" | "md" | "lg";
  emptyText?: string;
  stickyHeader?: boolean;
  maxHeight?: string;
  padding?: number;
  // 操作模式
  enableActions?: boolean;
  batchActions?: ActionButton[];
  rowActions?: (record: T) => ActionButton[];
  onSelectionChange?: (selectedKeys: (string | number)[]) => void;
  // 行点击事件
  onRowClick?: (record: T, index: number, event: React.MouseEvent) => void;
  // GridItem 配置
  headerHeight?: number;
  contentAreas?: GridArea[];
  contentWidth?: number;
  contentHeight?: number;
  footerHeight?: number;
}

export default function GridTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  loading = false,
  rowKey,
  page,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  searchPlaceholder = "搜索...",
  filterConfig,
  onFilterChange,
  striped = true,
  hoverable = true,
  bordered = false,
  size = "sm",
  emptyText = "暂无数据",
  stickyHeader = true,
  maxHeight = "100%",
  padding = 2.5,
  enableActions = false,
  batchActions = [],
  rowActions,
  onSelectionChange,
  onRowClick,
  headerHeight = 0.1,
  contentAreas = createArray(2, 11),
  contentWidth = 24 / 10,
  contentHeight = 2,
  footerHeight = 0.1,
}: GridTableProps<T>) {
  // 检测是否为移动设备
  const isMobile = useMobile();

  // 选中状态管理
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set(),
  );

  // 搜索状态管理
  const [searchValue, setSearchValue] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchValueRef = useRef<string>(""); // 记录上次触发的搜索值

  // 筛选状态管理
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({});
  const [tempFilterValues, setTempFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({});

  // 标记是否已从 URL 初始化
  const initializedRef = useRef(false);

  // 从 URL 读取初始筛选参数
  useEffect(() => {
    if (typeof window === "undefined" || !filterConfig || initializedRef.current)
      return;

    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    > = {};

    filterConfig.forEach((config) => {
      if (config.type === "checkboxGroup") {
        // 多选：URL 格式为 key=value1,value2,value3
        const value = urlParams.get(config.key);
        if (value) {
          initialFilters[config.key] = value.split(",");
        }
      } else if (config.type === "dateRange" && config.dateFields) {
        // 时间区间：分别读取开始和结束时间
        const startValue = urlParams.get(config.dateFields.start);
        const endValue = urlParams.get(config.dateFields.end);
        if (startValue || endValue) {
          initialFilters[config.key] = {
            start: startValue || undefined,
            end: endValue || undefined,
          };
        }
      } else if (config.type === "input") {
        // 单个输入框
        const value = urlParams.get(config.key);
        if (value !== null) {
          initialFilters[config.key] = value;
        }
      }
    });

    if (Object.keys(initialFilters).length > 0) {
      setFilterValues(initialFilters);
      setTempFilterValues(initialFilters);
      // 通知父组件初始筛选条件
      onFilterChange?.(initialFilters);
    }

    initializedRef.current = true;
  }, [filterConfig, onFilterChange]);

  // 判断是否有激活的筛选
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filterValues).length > 0;
  }, [filterValues]);

  // 搜索输入变化处理（防抖）
  useEffect(() => {
    if (!onSearchChange) return;

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器，1秒后触发搜索
    searchTimeoutRef.current = setTimeout(() => {
      // 只有当搜索值真正变化时才触发回调
      if (searchValue !== lastSearchValueRef.current) {
        lastSearchValueRef.current = searchValue;
        onSearchChange(searchValue);
      }
    }, 1000);

    // 清理函数
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, onSearchChange]);

  // 记录上一次的 page 值
  const prevPageRef = useRef(page);

  // 翻页时清理选中状态
  useEffect(() => {
    // 只有当 page 真正变化时才清空选中状态
    if (prevPageRef.current !== page) {
      if (selectedKeys.size > 0) {
        setSelectedKeys(new Set());
        onSelectionChange?.([]);
      }
      prevPageRef.current = page;
    }
  }, [page, selectedKeys.size, onSelectionChange]);

  // 获取行的唯一键
  const getRowKey = useCallback(
    (record: T): string | number => {
      return typeof rowKey === "function"
        ? rowKey(record)
        : (record[rowKey] as string | number);
    },
    [rowKey],
  );

  // 全选/取消全选
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allKeys = new Set(data.map(getRowKey));
        setSelectedKeys(allKeys);
        onSelectionChange?.(Array.from(allKeys));
      } else {
        setSelectedKeys(new Set());
        onSelectionChange?.([]);
      }
    },
    [data, getRowKey, onSelectionChange],
  );

  // 单选
  const handleSelectRow = useCallback(
    (key: string | number, checked: boolean) => {
      const newSelectedKeys = new Set(selectedKeys);
      if (checked) {
        newSelectedKeys.add(key);
      } else {
        newSelectedKeys.delete(key);
      }
      setSelectedKeys(newSelectedKeys);
      onSelectionChange?.(Array.from(newSelectedKeys));
    },
    [selectedKeys, onSelectionChange],
  );

  // 打开筛选对话框
  const openFilterDialog = useCallback(() => {
    setTempFilterValues({ ...filterValues });
    setFilterDialogOpen(true);
  }, [filterValues]);

  // 关闭筛选对话框
  const closeFilterDialog = useCallback(() => {
    setFilterDialogOpen(false);
  }, []);

  // 更新临时筛选值
  const updateTempFilterValue = useCallback(
    (
      key: string,
      value: string | string[] | { start?: string; end?: string },
    ) => {
      setTempFilterValues((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  // 切换 checkbox 选项
  const toggleCheckboxOption = useCallback((key: string, option: string) => {
    setTempFilterValues((prev) => {
      const currentValue = prev[key];
      const currentArray = Array.isArray(currentValue) ? currentValue : [];

      if (currentArray.includes(option)) {
        // 移除该选项
        const newArray = currentArray.filter((v) => v !== option);
        if (newArray.length === 0) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: newArray };
      } else {
        // 添加该选项
        return { ...prev, [key]: [...currentArray, option] };
      }
    });
  }, []);

  // 应用筛选
  const applyFilters = useCallback(() => {
    // 移除空值
    const cleanedFilters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    > = {};
    Object.entries(tempFilterValues).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // checkboxGroup: 只保留非空数组
        if (value.length > 0) {
          cleanedFilters[key] = value;
        }
      } else if (
        typeof value === "object" &&
        value !== null &&
        "start" in value
      ) {
        // dateRange: 至少有一个时间才保留
        if (value.start || value.end) {
          cleanedFilters[key] = value;
        }
      } else if (value !== "" && value !== undefined && value !== null) {
        // input: 非空字符串
        cleanedFilters[key] = value as string;
      }
    });

    setFilterValues(cleanedFilters);

    // 更新 URL 参数
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      // 清除旧的筛选参数
      filterConfig?.forEach((config) => {
        params.delete(config.key);
        if (config.type === "dateRange" && config.dateFields) {
          params.delete(config.dateFields.start);
          params.delete(config.dateFields.end);
        }
      });

      // 添加新的筛选参数
      Object.entries(cleanedFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // checkboxGroup: 用逗号连接
          params.set(key, value.join(","));
        } else if (
          typeof value === "object" &&
          value !== null &&
          "start" in value
        ) {
          // dateRange: 分别设置开始和结束时间
          const config = filterConfig?.find((c) => c.key === key);
          if (config?.type === "dateRange" && config.dateFields) {
            if (value.start) {
              params.set(config.dateFields.start, value.start);
            }
            if (value.end) {
              params.set(config.dateFields.end, value.end);
            }
          }
        } else {
          // input: 直接设置
          params.set(key, String(value));
        }
      });

      // 使用 pushState 更新 URL，不刷新页面
      window.history.pushState({}, "", url.toString());
    }

    // 通知父组件
    onFilterChange?.(cleanedFilters);

    // 重置到第一页
    onPageChange(1);

    closeFilterDialog();
  }, [
    tempFilterValues,
    filterConfig,
    onFilterChange,
    onPageChange,
    closeFilterDialog,
  ]);

  // 重置筛选
  const resetFilters = useCallback(() => {
    setTempFilterValues({});
    setFilterValues({});

    // 清除 URL 参数
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      filterConfig?.forEach((config) => {
        params.delete(config.key);
        if (config.type === "dateRange" && config.dateFields) {
          params.delete(config.dateFields.start);
          params.delete(config.dateFields.end);
        }
      });

      window.history.pushState({}, "", url.toString());
    }

    // 通知父组件
    onFilterChange?.({});

    // 重置到第一页
    onPageChange(1);

    closeFilterDialog();
  }, [filterConfig, onFilterChange, onPageChange, closeFilterDialog]);

  // 是否全选
  const isAllSelected = useMemo(() => {
    return data.length > 0 && selectedKeys.size === data.length;
  }, [data.length, selectedKeys.size]);

  // 构建包含复选框和操作列的 columns
  const enhancedColumns = useMemo(() => {
    if (!enableActions) {
      return columns;
    }

    const newColumns: TableColumn<T>[] = [];

    // 添加复选框列（第一列）
    newColumns.push({
      key: "__selection__",
      title: "",
      width: "60px",
      headerRender: () => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={isAllSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
            size={size}
          />
        </div>
      ),
      render: (_, record) => {
        const key = getRowKey(record);
        return (
          <div
            className="flex items-center justify-center"
            data-action-cell="true"
          >
            <Checkbox
              checked={selectedKeys.has(key)}
              onChange={(e) => handleSelectRow(key, e.target.checked)}
              size={size}
            />
          </div>
        );
      },
    });

    // 添加原有列
    newColumns.push(...columns);

    // 添加操作列（最后一列）
    if (rowActions) {
      newColumns.push({
        key: "__actions__",
        title: "操作",
        width: "auto",
        render: (_, record) => {
          const actions = rowActions(record);
          return (
            <div className="flex items-center" data-action-cell="true">
              {actions.map((action) => (
                <Tooltip
                  key={action.label}
                  content={action.label}
                  placement="top"
                >
                  <Clickable
                    onClick={action.onClick}
                    className={`
                      p-2 rounded transition-colors
                      ${action.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}
                      ${action.variant === "danger" ? "text-error" : ""}
                    `}
                    disabled={action.disabled}
                  >
                    {action.icon}
                  </Clickable>
                </Tooltip>
              ))}
            </div>
          );
        },
      });
    }

    return newColumns;
  }, [
    enableActions,
    columns,
    rowActions,
    selectedKeys,
    size,
    isAllSelected,
    handleSelectAll,
    handleSelectRow,
    getRowKey,
  ]);

  return (
    <>
      {/* 表头 */}
      <GridItem
        areas={[1]}
        width={24}
        height={headerHeight}
        className="flex items-center justify-between text-2xl px-10"
      >
        <div>{title}</div>
        <div className="flex items-center gap-4">
          {onSearchChange && (
            <>
              {isMobile ? (
                // 移动端：显示搜索图标
                <Tooltip content="搜索" placement="bottom">
                  <Clickable
                    onClick={() => setSearchDialogOpen(true)}
                    className="p-2 rounded transition-colors hover:bg-muted inline-flex"
                    hoverScale={1.1}
                  >
                    <RiSearchLine size="1em" />
                  </Clickable>
                </Tooltip>
              ) : (
                // 桌面端：显示搜索输入框
                <div className="relative w-[15em]">
                  <input
                    title="search"
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="
                  relative w-full bg-transparent border-0
                  px-0 py-2 text-base text-white
                  focus:outline-none
                "
                  />
                  {/* 底部横线 */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 w-full"
                    initial={{ backgroundColor: "#ffffff" }}
                    animate={{
                      backgroundColor:
                        searchValue.length > 0
                          ? "var(--color-primary)"
                          : "#ffffff",
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                  />
                  {/* Label - 固定位置，有输入时隐藏 */}
                  <motion.label
                    className="absolute top-2 left-0 pointer-events-none whitespace-nowrap flex items-center text-base text-white"
                    animate={{
                      opacity: searchValue.length > 0 ? 0 : 1,
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    <RiSearchLine size="1em" className="inline mr-1" />
                    {searchPlaceholder}
                  </motion.label>
                  {/* 清空按钮 - 有输入时显示在右侧 */}
                  <AnimatePresence>
                    {searchValue.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.68, -0.55, 0.265, 1.55],
                        }}
                        onClick={() => setSearchValue("")}
                        className="absolute right-0 top-2 text-primary hover:text-white transition-colors cursor-pointer flex items-center"
                        type="button"
                      >
                        <RiCloseLine size="1em" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
          {filterConfig && filterConfig.length > 0 && (
            <Tooltip
              content={hasActiveFilters ? "筛选（已激活）" : "筛选"}
              placement="bottom"
            >
              <Clickable
                onClick={openFilterDialog}
                className={`
                  p-2 rounded transition-colors inline-flex
                  ${hasActiveFilters ? "text-background bg-foreground" : "hover:bg-muted"}
                `}
                hoverScale={1.1}
              >
                <RiFilterLine size="1em" />
              </Clickable>
            </Tooltip>
          )}
        </div>
      </GridItem>

      {/* 表格内容 */}
      <GridItem
        areas={contentAreas}
        width={contentWidth}
        height={contentHeight}
      >
        <div className="flex flex-col h-full">
          {/* 操作栏（批量操作） */}
          <AnimatePresence>
            {enableActions &&
              batchActions &&
              batchActions.length > 0 &&
              selectedKeys.size > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: "easeInOut" },
                    opacity: { duration: 0.2, ease: "easeInOut" },
                  }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between px-10 py-2 border-b border-muted">
                    <div className="flex items-center gap-4">
                      <AutoTransition key={selectedKeys.size}>
                        <span className="text-primary">
                          已选中 {selectedKeys.size} 项
                        </span>
                      </AutoTransition>
                    </div>
                    <div className="flex items-center gap-2">
                      {batchActions.map((action) => (
                        <Button
                          key={action.label}
                          label={action.label || "操作"}
                          variant={action.variant || "outline"}
                          size={"sm"}
                          icon={action.icon}
                          onClick={action.onClick}
                          disabled={action.disabled || selectedKeys.size === 0}
                          loading={action.loading}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          <AutoTransition type="fade" className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-full" key="loading">
                <LoadingIndicator />
              </div>
            ) : (
              <div className="h-full flex flex-col" key="content">
                <div className="flex-1 overflow-auto">
                  <Table
                    columns={enhancedColumns}
                    data={data}
                    striped={striped}
                    hoverable={hoverable}
                    bordered={bordered}
                    size={size}
                    emptyText={emptyText}
                    rowKey={rowKey}
                    stickyHeader={stickyHeader}
                    maxHeight={maxHeight}
                    padding={padding}
                    onSortChange={onSortChange}
                    onRowClick={onRowClick}
                  />
                </div>
              </div>
            )}
          </AutoTransition>
        </div>
      </GridItem>

      {/* 表尾分页 */}
      <GridItem
        areas={[12]}
        width={24}
        height={footerHeight}
        className="flex justify-between pl-10 pr-6"
      >
        <div className="flex items-center gap-2">
          <AutoTransition key={totalRecords} type="fade">
            共 {totalRecords} 条
          </AutoTransition>
          <span>/</span>
          <AutoTransition key={page + "" + totalRecords} type="fade">
            第 {(page - 1) * pageSize + 1}
            {" - "}
            {Math.min(page * pageSize, totalRecords)} 条
          </AutoTransition>
          <span>/</span>
          <div className="flex items-center gap-2">
            {onPageSizeChange && (
              <Select
                value={pageSize}
                onChange={(value) => {
                  onPageSizeChange(Number(value));
                  onPageChange(1);
                }}
                options={[
                  { value: 10, label: "10 条/页" },
                  { value: 25, label: "25 条/页" },
                  { value: 50, label: "50 条/页" },
                  { value: 100, label: "100 条/页" },
                  { value: 250, label: "250 条/页" },
                  { value: 500, label: "500 条/页" },
                ]}
                size="sm"
              />
            )}
          </div>
        </div>
        <div className="flex items-center">
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Clickable
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded transition-colors hover:bg-muted"
                enableHoverScale={false}
              >
                <RiArrowLeftSLine />
              </Clickable>

              <span>
                <AutoTransition key={page} type="fade">
                  第 {page} / {totalPages} 页
                </AutoTransition>
              </span>

              <Clickable
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded transition-colors hover:bg-muted"
                enableHoverScale={false}
              >
                <RiArrowRightSLine />
              </Clickable>
            </div>
          )}
        </div>
      </GridItem>

      {/* 筛选 Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={closeFilterDialog}
        title="筛选条件"
        size="md"
      >
        <div className="px-6 py-6 space-y-6">
          <div className="space-y-6">
            {filterConfig?.map((config) => (
              <div key={config.key}>
                {config.type !== "input" && (
                  <label className="block text-sm font-medium text-foreground mb-3">
                    {config.label}
                  </label>
                )}
                {config.type === "checkboxGroup" && config.options && (
                  <div className="flex gap-4">
                    {config.options.map((option) => {
                      const currentValue = tempFilterValues[config.key];
                      const currentArray = Array.isArray(currentValue)
                        ? currentValue
                        : [];
                      return (
                        <Checkbox
                          key={option.value}
                          label={option.label}
                          checked={currentArray.includes(String(option.value))}
                          onChange={() =>
                            toggleCheckboxOption(
                              config.key,
                              String(option.value),
                            )
                          }
                        />
                      );
                    })}
                  </div>
                )}
                {config.type === "input" && (
                  <Input
                    label={config.label}
                    value={(tempFilterValues[config.key] as string) || ""}
                    onChange={(e) =>
                      updateTempFilterValue(config.key, e.target.value)
                    }
                    helperText={config.placeholder}
                    type={config.inputType || "text"}
                    size="sm"
                  />
                )}
                {config.type === "dateRange" && config.dateFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="开始时间"
                        type="datetime-local"
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.start || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: e.target.value || undefined,
                            end: currentValue?.end,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                    <div>
                      <Input
                        label="结束时间"
                        type="datetime-local"
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.end || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: currentValue?.start,
                            end: e.target.value || undefined,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
                {config.type === "range" && config.rangeFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label={config.placeholderMin || "最小值"}
                        type={config.inputType || "number"}
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.start || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: e.target.value || undefined,
                            end: currentValue?.end,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                    <div>
                      <Input
                        label={config.placeholderMax || "最大值"}
                        type={config.inputType || "number"}
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.end || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: currentValue?.start,
                            end: e.target.value || undefined,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between pt-4 border-t border-foreground/10">
            <Button
              label="重置"
              variant="ghost"
              onClick={resetFilters}
              size="sm"
            />
            <div className="flex gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={closeFilterDialog}
                size="sm"
              />
              <Button
                label="确认"
                variant="primary"
                onClick={applyFilters}
                size="sm"
              />
            </div>
          </div>
        </div>
      </Dialog>

      {/* 搜索 Dialog（移动端） */}
      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        title="搜索"
        size="sm"
      >
        <div className="px-6 py-6">
          <Input
            label="搜索关键词"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            helperText={searchPlaceholder}
            type="text"
            size="md"
            autoFocus
          />
          <div className="flex justify-end gap-4 pt-6 border-t border-foreground/10 mt-6">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => setSearchDialogOpen(false)}
              size="sm"
            />
            <Button
              label="搜索"
              variant="primary"
              onClick={() => setSearchDialogOpen(false)}
              size="sm"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
