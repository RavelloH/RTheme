"use client";

import { GridItem, GridArea } from "@/components/RowGrid";
import { createArray } from "@/lib/client/createArray";
import { Table, TableColumn } from "@/ui/Table";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

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
  // 表格配置
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  size?: "sm" | "md" | "lg";
  emptyText?: string;
  stickyHeader?: boolean;
  maxHeight?: string;
  padding?: number;
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
  striped = true,
  hoverable = true,
  bordered = false,
  size = "sm",
  emptyText = "暂无数据",
  stickyHeader = true,
  maxHeight = "100%",
  padding = 2.5,
  headerHeight = 0.1,
  contentAreas = createArray(2, 11),
  contentWidth = 24 / 10,
  contentHeight = 2,
  footerHeight = 0.1,
}: GridTableProps<T>) {
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
          <AutoTransition type="fade" className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-full" key="loading">
                <LoadingIndicator />
              </div>
            ) : (
              <div className="h-full flex flex-col" key="content">
                <div className="flex-1 overflow-auto">
                  <Table
                    columns={columns}
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
          <div>单页显示</div>
        </div>
        <div className="flex items-center">
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Clickable
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded transition-colors hover:bg-accent"
                enableHoverScale={false}
              >
                <RiArrowLeftSLine />
              </Clickable>

              <span className="">
                第 {page} / {totalPages} 页
              </span>

              <Clickable
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded transition-colors hover:bg-accent"
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
