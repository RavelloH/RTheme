"use client";

import { GridItem, GridArea } from "@/components/RowGrid";
import { createArray } from "@/lib/client/createArray";
import { Table, TableColumn } from "@/ui/Table";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { Select } from "@/ui/Select";
import { Button, ButtonProps } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// 操作按钮配置
export interface ActionButton {
  label?: string; // label 改为可选，用于批量操作按钮
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
  loading?: boolean;
}

export interface GridTableProps<T extends Record<string, unknown>> {
  title: string;
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
  headerHeight = 0.1,
  contentAreas = createArray(2, 11),
  contentWidth = 24 / 10,
  contentHeight = 2,
  footerHeight = 0.1,
}: GridTableProps<T>) {
  // 选中状态管理
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set(),
  );

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
          <div className="flex items-center justify-center">
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
            <div className="flex items-center ">
              {actions.map((action, index) => (
                <Clickable
                  key={index}
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
        className="flex items-center text-2xl px-10"
      >
        <div>{title}</div>
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
                      {batchActions.map((action, index) => (
                        <Button
                          key={index}
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
          <AutoTransition key={totalRecords}>
            共 {totalRecords} 条
          </AutoTransition>
          <span>/</span>
          <AutoTransition key={page} type="fade">
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
    </>
  );
}
