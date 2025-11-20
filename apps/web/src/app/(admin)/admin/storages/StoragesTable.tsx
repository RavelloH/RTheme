"use client";

import {
  getStorageList,
  updateStorage,
  deleteStorage,
  toggleStorageStatus,
  setDefaultStorage,
} from "@/actions/storage";
import GridTable, { ActionButton, FilterConfig } from "@/components/GridTable";
import runWithAuth from "@/lib/client/runWithAuth";
import { TableColumn } from "@/ui/Table";
import React, { useCallback, useEffect, useState } from "react";
import type { StorageListItem } from "@repo/shared-types/api/storage";
import { useBroadcast } from "@/hooks/useBroadcast";
import {
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiEyeOffLine,
  RiStarLine,
  RiStarFill,
} from "@remixicon/react";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { SelectOption } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import { Button } from "@/ui/Button";
import { AlertDialog } from "@/ui/AlertDialog";
import { useToast } from "@/ui/Toast";

interface StorageFormState {
  name: string;
  displayName: string;
  baseUrl: string;
  isActive: boolean;
  isDefault: boolean;
  maxFileSize: number;
  pathTemplate: string;
  config: string; // JSON string
}

const STORAGE_TYPES: SelectOption[] = [
  { value: "LOCAL", label: "本地存储" },
  { value: "AWS_S3", label: "AWS S3" },
  { value: "GITHUB_PAGES", label: "GitHub Pages" },
  { value: "VERCEL_BLOB", label: "Vercel Blob" },
];

export default function StoragesTable() {
  const [data, setData] = useState<StorageListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "id" | "name" | "type" | "createdAt" | "updatedAt"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStorage, setEditingStorage] = useState<StorageListItem | null>(
    null,
  );
  const [formData, setFormData] = useState<StorageFormState>({
    name: "",
    displayName: "",
    baseUrl: "",
    isActive: true,
    isDefault: false,
    maxFileSize: 52428800,
    pathTemplate: "/{year}/{month}/{filename}",
    config: "{}",
  });
  const [submitting, setSubmitting] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  useBroadcast<{ type: "storages-refresh" }>((message) => {
    if (message?.type === "storages-refresh") {
      fetchData();
    }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam =
        typeof filters.type === "string"
          ? (filters.type as
              | "LOCAL"
              | "AWS_S3"
              | "GITHUB_PAGES"
              | "VERCEL_BLOB")
          : undefined;
      const isActiveParam =
        filters.isActive !== undefined ? Boolean(filters.isActive) : undefined;
      const isDefaultParam =
        filters.isDefault !== undefined
          ? Boolean(filters.isDefault)
          : undefined;

      const result = await runWithAuth(getStorageList, {
        page,
        pageSize,
        sortBy,
        sortOrder,
        search: search || undefined,
        type: typeParam,
        isActive: isActiveParam,
        isDefault: isDefaultParam,
      });

      if (result && "data" in result && result.data) {
        // API 返回遵循 shared-types 中的 Paginated Response：
        // result.data 是条目数组，分页信息在 result.meta 中
        setData(result.data as StorageListItem[]);
        setTotalPages((result.meta?.totalPages as number) || 1);
        setTotalRecords((result.meta?.total as number) || 0);
      }
    } catch (e: unknown) {
      console.error("获取存储列表失败:", e);
      toastError("获取存储列表失败", "请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, search, filters, toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (record: StorageListItem) => {
    setEditingStorage(record);
    setFormData({
      name: record.name,
      displayName: record.displayName,
      baseUrl: record.baseUrl,
      isActive: record.isActive,
      isDefault: record.isDefault,
      maxFileSize: record.maxFileSize,
      pathTemplate: record.pathTemplate,
      config: "{}", // 需要获取详细信息
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (records: StorageListItem[]) => {
    if (records.length === 0) return;
    setEditingStorage(records[0] || null);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (record: StorageListItem) => {
    try {
      const result = await runWithAuth(toggleStorageStatus, {
        id: record.id,
        isActive: !record.isActive,
      });

      if (result && "data" in result) {
        toastSuccess(
          record.isActive ? "存储已停用" : "存储已激活",
          `${record.displayName} 状态已更新`,
        );
        fetchData();
      }
    } catch {
      toastError("操作失败", "无法更新存储状态");
    }
  };

  const handleSetDefault = async (record: StorageListItem) => {
    try {
      const result = await runWithAuth(setDefaultStorage, {
        id: record.id,
      });

      if (result && "data" in result) {
        toastSuccess("默认存储已更新", `${record.displayName} 已设为默认存储`);
        fetchData();
      }
    } catch {
      toastError("操作失败", "无法设置默认存储");
    }
  };

  const handleFormSubmit = async () => {
    if (!editingStorage) return;

    setSubmitting(true);
    try {
      let configValue;
      try {
        configValue = JSON.parse(formData.config);
      } catch {
        toastError("配置格式错误", "请输入有效的JSON格式");
        setSubmitting(false);
        return;
      }

      const result = await runWithAuth(updateStorage, {
        id: editingStorage.id,
        name: formData.name,
        displayName: formData.displayName,
        baseUrl: formData.baseUrl,
        isActive: formData.isActive,
        isDefault: formData.isDefault,
        maxFileSize: formData.maxFileSize,
        pathTemplate: formData.pathTemplate,
        config: configValue,
      });

      if (result && "data" in result) {
        toastSuccess("存储已更新", `${formData.displayName} 配置已保存`);
        setEditDialogOpen(false);
        fetchData();
      }
    } catch {
      toastError("更新失败", "无法保存存储配置");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!editingStorage) return;

    try {
      const result = await runWithAuth(deleteStorage, {
        ids: [editingStorage.id],
      });

      if (result && "data" in result) {
        toastSuccess("存储已删除", `${editingStorage?.displayName} 已被删除`);
        setDeleteDialogOpen(false);
        setSelectedKeys([]);
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toastError("删除失败", msg || "无法删除存储");
    }
  };

  const columns: TableColumn<StorageListItem>[] = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "显示名称",
      dataIndex: "displayName",
      key: "displayName",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (value: unknown) => {
        const type = String(value);
        const typeLabels: Record<string, string> = {
          LOCAL: "本地存储",
          AWS_S3: "AWS S3",
          GITHUB_PAGES: "GitHub Pages",
          VERCEL_BLOB: "Vercel Blob",
        };
        return typeLabels[type] || type;
      },
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (value: unknown) => {
        const isActive = Boolean(value);
        return (
          <div className="flex items-center gap-2">
            {isActive ? (
              <>
                <RiCheckLine className="text-green-500" />
                <span>激活</span>
              </>
            ) : (
              <>
                <RiCloseLine className="text-red-500" />
                <span>停用</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      title: "默认",
      dataIndex: "isDefault",
      key: "isDefault",
      render: (value: unknown) => {
        const isDefault = Boolean(value);
        return (
          <div className="flex items-center gap-2">
            {isDefault ? (
              <>
                <RiStarFill className="text-yellow-500" />
                <span>是</span>
              </>
            ) : (
              <span>否</span>
            )}
          </div>
        );
      },
    },
    {
      title: "文件数量",
      dataIndex: "mediaCount",
      key: "mediaCount",
      render: (value: unknown) => {
        const count = Number(value);
        return count.toLocaleString();
      },
    },
  ];

  const filterConfig: FilterConfig[] = [
    {
      key: "type",
      label: "存储类型",
      type: "checkboxGroup",
      options: STORAGE_TYPES,
    },
    {
      key: "isActive",
      label: "状态",
      type: "checkboxGroup",
      options: [
        { value: "true", label: "激活" },
        { value: "false", label: "停用" },
      ],
    },
    {
      key: "isDefault",
      label: "默认存储",
      type: "checkboxGroup",
      options: [
        { value: "true", label: "是" },
        { value: "false", label: "否" },
      ],
    },
  ];

  const batchActions: ActionButton[] = [
    {
      label: "批量删除",
      onClick: () => {
        const records = data.filter((item) => selectedKeys.includes(item.id));
        handleDelete(records);
      },
      icon: <RiDeleteBinLine />,
      variant: "danger",
      disabled: selectedKeys.length === 0,
    },
  ];

  const rowActions = (record: StorageListItem): ActionButton[] => [
    {
      label: "编辑",
      onClick: () => handleEdit(record),
      icon: <RiEditLine />,
    },
    {
      label: record.isActive ? "停用" : "激活",
      onClick: () => handleToggleStatus(record),
      icon: record.isActive ? <RiEyeOffLine /> : <RiEyeLine />,
    },
    {
      label: "设为默认",
      onClick: () => handleSetDefault(record),
      icon: <RiStarLine />,
      disabled: record.isDefault,
    },
    {
      label: "删除",
      onClick: () => handleDelete([record]),
      icon: <RiDeleteBinLine />,
      variant: "danger",
    },
  ];

  return (
    <>
      <GridTable<StorageListItem>
        title="存储管理"
        columns={columns}
        data={data}
        loading={loading}
        rowKey="id"
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={(key, order) => {
          if (key)
            setSortBy(
              key as "id" | "name" | "type" | "createdAt" | "updatedAt",
            );
          if (order) setSortOrder(order);
        }}
        onSearchChange={setSearch}
        searchPlaceholder="搜索存储名称或显示名称..."
        filterConfig={filterConfig}
        onFilterChange={setFilters}
        enableActions={true}
        batchActions={batchActions}
        rowActions={rowActions}
        onSelectionChange={(selectedKeys) =>
          setSelectedKeys(selectedKeys as string[])
        }
        onRowClick={(record) => handleEdit(record)}
        striped
        hoverable
        bordered={false}
        size="sm"
        stickyHeader
        maxHeight="600px"
        padding={2.5}
      />

      {/* 编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="编辑存储配置"
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">名称</label>
              <Input
                label="存储名称"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="存储名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium">显示名称</label>
              <Input
                label="显示名称"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="显示名称"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">基础URL</label>
            <Input
              label="基础URL"
              value={formData.baseUrl}
              onChange={(e) =>
                setFormData({ ...formData, baseUrl: e.target.value })
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">最大文件大小</label>
              <Input
                label="最大文件大小"
                type="number"
                value={formData.maxFileSize}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxFileSize: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="52428800"
              />
              <p className="text-xs text-muted-foreground mt-1">
                字节数，默认 50MB
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">路径模板</label>
              <Input
                label="路径模板"
                value={formData.pathTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, pathTemplate: e.target.value })
                }
                placeholder="/{year}/{month}/{filename}"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Switch
              label="激活存储"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: Boolean(checked) })
              }
            />
            <Switch
              label="设为默认存储"
              checked={formData.isDefault}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isDefault: Boolean(checked) })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">配置 (JSON)</label>
            <Input
              label="配置 (JSON)"
              value={formData.config}
              onChange={(
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => setFormData({ ...formData, config: e.target.value })}
              placeholder="{}"
            />
            <p className="text-xs text-muted-foreground mt-1">
              请输入有效的JSON格式配置
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            label="取消"
            variant="outline"
            onClick={() => setEditDialogOpen(false)}
          >
            取消
          </Button>
          <Button
            label={submitting ? "保存中..." : "保存"}
            onClick={handleFormSubmit}
            disabled={submitting}
          >
            {submitting ? "保存中..." : "保存"}
          </Button>
        </div>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="确认删除存储"
        description={`确定要删除存储 "${editingStorage?.displayName}" 吗？此操作不可撤销，且只有没有关联媒体文件的存储才能被删除。`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />
    </>
  );
}
