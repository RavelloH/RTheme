"use client";

import React from "react";
import { motion } from "framer-motion";
import { AutoTransition } from "./AutoTransition";

export interface TableColumn<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  /** 自定义表头渲染函数，如果提供则覆盖 title */
  headerRender?: () => React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  fixed?: "left" | "right";
  /** 列宽度 */
  width?: string | number;
  /**
   * 是否使用等宽字体（应用于 th 和 td）
   * @default false
   */
  mono?: boolean;
}

export interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  className?: string;
  /**
   * 是否显示斑马纹
   * @default false
   */
  striped?: boolean;
  /**
   * 是否启用 hover 高亮
   * @default true
   */
  hoverable?: boolean;
  /**
   * 是否显示边框
   * @default false
   */
  bordered?: boolean;
  /**
   * 表格大小
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * 是否显示表头
   * @default true
   */
  showHeader?: boolean;
  /**
   * 空数据时显示的内容
   */
  emptyText?: React.ReactNode;
  /**
   * 行的唯一键
   */
  rowKey?: keyof T | ((record: T) => string | number);
  /**
   * 行点击事件
   */
  onRowClick?: (record: T, index: number, event: React.MouseEvent) => void;
  /**
   * 自定义行类名
   */
  rowClassName?: string | ((record: T, index: number) => string);
  /**
   * 是否启用行动画
   * @default true
   */
  animateRows?: boolean;
  /**
   * 是否固定表头
   * @default false
   */
  stickyHeader?: boolean;
  /**
   * 表格最大高度（固定表头时使用）
   */
  maxHeight?: string | number;
  /**
   * 排序变化回调
   */
  onSortChange?: (key: string, order: "asc" | "desc" | null) => void;
  /**
   * 表格左右内边距（只在表格最左侧和最右侧添加，不影响背景显示）
   * padding 区域的背景正常显示（例如斑马纹），只是文字不在该区域显示
   * @default 0
   */
  padding?: number;
}

interface SortState {
  key: string | null;
  order: "asc" | "desc" | null;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  className = "",
  striped = false,
  hoverable = true,
  bordered = false,
  size = "md",
  showHeader = true,
  emptyText = "暂无数据",
  rowKey,
  onRowClick,
  rowClassName,
  animateRows = true,
  stickyHeader = false,
  maxHeight,
  onSortChange,
  padding = 0,
}: TableProps<T>) {
  const [sortState, setSortState] = React.useState<SortState>({
    key: null,
    order: null,
  });

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "text-sm";
      case "md":
        return "text-base";
      case "lg":
        return "text-lg";
      default:
        return "text-base";
    }
  };

  const getPaddingStyles = () => {
    switch (size) {
      case "sm":
        return "px-2 py-2";
      case "md":
        return "px-4 py-3";
      case "lg":
        return "px-6 py-4";
      default:
        return "px-4 py-3";
    }
  };

  const getRowKey = (record: T, index: number): string | number => {
    if (!rowKey) return index;
    if (typeof rowKey === "function") return rowKey(record);
    const value = record[rowKey];
    return String(value);
  };

  const getRowClassName = (record: T, index: number): string => {
    if (typeof rowClassName === "function") return rowClassName(record, index);
    return rowClassName || "";
  };

  const handleSort = (columnKey: string) => {
    let newOrder: "asc" | "desc" | null = "asc";

    if (sortState.key === columnKey) {
      if (sortState.order === "asc") {
        newOrder = "desc";
      } else if (sortState.order === "desc") {
        newOrder = null;
      }
    }

    setSortState({
      key: newOrder ? columnKey : null,
      order: newOrder,
    });

    onSortChange?.(columnKey, newOrder);
  };

  const renderCellContent = (
    column: TableColumn<T>,
    record: T,
    index: number,
  ): React.ReactNode => {
    if (column.render) {
      return column.render(
        column.dataIndex ? record[column.dataIndex] : record,
        record,
        index,
      );
    }
    const value = column.dataIndex ? record[column.dataIndex] : "";
    // 将值转换为可渲染的类型
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getAlignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    const isActive = sortState.key === columnKey;
    const order = isActive ? sortState.order : null;

    return (
      <span className="inline-flex flex-col ml-1 opacity-50 hover:opacity-100 transition-opacity">
        <svg
          className={`w-3 h-3 -mb-1 ${order === "asc" ? "text-primary" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
        </svg>
        <svg
          className={`w-3 h-3 -mt-1 ${order === "desc" ? "text-primary" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" />
        </svg>
      </span>
    );
  };

  const tableContainerClasses = `
    ${stickyHeader || maxHeight ? "overflow-auto" : "overflow-x-auto"}
    ${className}
  `;

  const tableClasses = `
    w-full
    ${getSizeStyles()}
    ${bordered ? "border border-border" : ""}
  `;

  const containerStyle: React.CSSProperties = {};
  if (maxHeight) {
    containerStyle.maxHeight =
      typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;
  }

  const hasContainerStyle = maxHeight !== undefined;

  return (
    <div
      className={tableContainerClasses}
      {...(hasContainerStyle && { style: containerStyle })}
    >
      <table className={tableClasses}>
        {showHeader && (
          <thead
            className={`
              ${stickyHeader ? "sticky top-0 z-10 shadow-sm backdrop-blur-sm after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-muted" : ""}
            `}
          >
            <tr className={stickyHeader ? "bg-background relative" : ""}>
              {columns.map((column, columnIndex) => (
                <th
                  key={column.key}
                  className={`
                    ${getPaddingStyles()}
                    font-semibold
                    text-muted-foreground
                    bg-background
                    ${!stickyHeader ? "border-b-2 border-muted" : ""}
                    ${bordered ? "border-r border-border last:border-r-0" : ""}
                    ${column.sortable ? "cursor-pointer select-none hover:bg-muted/80 transition-colors" : ""}
                  `}
                  style={column.width ? { width: column.width } : undefined}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div
                    className={`flex items-center gap-1 ${
                      column.align === "center"
                        ? "justify-center"
                        : column.align === "right"
                          ? "justify-end"
                          : "justify-start"
                    }`}
                    {...(padding > 0 && {
                      style: {
                        ...(columnIndex === 0 && {
                          paddingLeft: `${padding}em`,
                        }),
                        ...(columnIndex === columns.length - 1 && {
                          paddingRight: `${padding}em`,
                        }),
                      },
                    })}
                  >
                    <span>
                      {column.headerRender
                        ? column.headerRender()
                        : column.title}
                    </span>
                    {column.sortable && <SortIcon columnKey={column.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={`${getPaddingStyles()} text-center text-muted-foreground`}
              >
                <div
                  {...(padding > 0 && {
                    style: {
                      paddingLeft: `${padding}em`,
                      paddingRight: `${padding}em`,
                    },
                  })}
                >
                  <AutoTransition type="fade">
                    <div className="py-8">{emptyText}</div>
                  </AutoTransition>
                </div>
              </td>
            </tr>
          ) : (
            data.map((record, index) => {
              const RowWrapper = animateRows ? motion.tr : "tr";
              const animationProps = animateRows
                ? {
                    initial: { opacity: 0, y: -10 },
                    animate: { opacity: 1, y: 0 },
                    transition: {
                      duration: 0.1,
                      delay: Math.min(index * 0.01, 0.5),
                    },
                  }
                : {};

              return (
                <RowWrapper
                  key={getRowKey(record, index)}
                  className={`
                    ${striped && index % 2 === 1 ? "bg-muted/25" : ""}
                    ${hoverable ? "hover:bg-muted transition-colors duration-200 ease-out" : ""}
                    ${onRowClick ? "cursor-pointer" : ""}
                    ${getRowClassName(record, index)}
                  `}
                  onClick={(e) => onRowClick?.(record, index, e)}
                  {...animationProps}
                >
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      className={`
                        ${getPaddingStyles()}
                        ${getAlignClass(column.align)}
                        ${column.mono ? "font-mono" : ""}
                        ${!striped ? "border-t border-border" : ""}
                      `}
                      style={column.width ? { width: column.width } : undefined}
                    >
                      <div
                        {...(padding > 0 && {
                          style: {
                            ...(columnIndex === 0 && {
                              paddingLeft: `${padding}em`,
                            }),
                            ...(columnIndex === columns.length - 1 && {
                              paddingRight: `${padding}em`,
                            }),
                          },
                        })}
                      >
                        {
                          renderCellContent(
                            column,
                            record,
                            index,
                          ) as React.ReactNode
                        }
                      </div>
                    </td>
                  ))}
                </RowWrapper>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// 导出子组件以支持更灵活的使用
export const TableHeader = motion.thead;
export const TableBody = motion.tbody;
export const TableRow = motion.tr;
export const TableHead = motion.th;
export const TableCell = motion.td;
