"use client";

import { type ReactElement, useEffect, useRef, useState } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiExternalLinkLine,
  RiFileEditLine,
} from "@remixicon/react";
import type { PageListItem } from "@repo/shared-types/api/page";

import {
  deletePages,
  getPagesList,
  updatePage,
  updatePages,
} from "@/actions/page";
import type { ActionButton, FilterConfig } from "@/components/ui/GridTable";
import GridTable from "@/components/ui/GridTable";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { useBroadcast } from "@/hooks/use-broadcast";
import runWithAuth from "@/lib/client/run-with-auth";
import { AlertDialog } from "@/ui/AlertDialog";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import type { SelectOption } from "@/ui/Select";
import { Select } from "@/ui/Select";
import type { TableColumn } from "@/ui/Table";
import { useToast } from "@/ui/Toast";

type ConfigRecord = Record<string, unknown>;

const isConfigObject = (value: unknown): value is ConfigRecord =>
  typeof value === "object" && value !== null;

const getValueAtPath = (source: unknown, path: string[]): unknown => {
  return path.reduce<unknown>((current, segment) => {
    if (!segment) {
      return undefined;
    }
    if (!isConfigObject(current)) {
      return undefined;
    }
    return (current as ConfigRecord)[segment];
  }, source);
};

const setValueAtPath = (
  target: ConfigRecord,
  path: string[],
  val: unknown,
): void => {
  if (path.length === 0) return;
  const [currentKey, ...rest] = path;
  if (!currentKey) return;
  if (rest.length === 0) {
    target[currentKey] = currentKey === "enabled" ? Boolean(val) : val;
    return;
  }

  const nextValue = target[currentKey];
  if (isConfigObject(nextValue)) {
    setValueAtPath(nextValue as ConfigRecord, rest, val);
    return;
  }

  const newChild: ConfigRecord = {};
  target[currentKey] = newChild;
  setValueAtPath(newChild, rest, val);
};

interface PageFormState {
  title: string;
  slug: string;
  status: PageListItem["status"];
  contentType: PageListItem["contentType"];
  content: string;
  config: ConfigRecord | null;
  metaDescription: string;
  metaKeywords: string;
  robotsIndex: boolean;
}

// 判断是否为日期字符串（从 SettingsSheet 复制）
const isDateString = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

  // ISO 8601 格式检测
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(value)) return false;

  // 验证是否为有效日期
  const date = new Date(value);
  return !isNaN(date.getTime());
};

// 获取页面配置字段输入组件配置（参考 SettingsSheet 的 getInputConfig）
const getPageConfigInputConfig = (
  value: unknown,
): {
  type?: string;
  rows?: number;
  useSelect?: boolean;
  isJsonObject?: boolean;
} => {
  // 如果是布尔值，使用 Select 组件
  if (typeof value === "boolean") {
    return {
      useSelect: true,
      type: "text",
      rows: undefined,
      isJsonObject: false,
    };
  }

  // 如果是日期字符串，使用 datetime-local 类型
  if (isDateString(value)) {
    return {
      type: "datetime-local",
      rows: undefined,
      useSelect: false,
      isJsonObject: false,
    };
  }

  // 如果是数组，使用多行文本 Input
  if (Array.isArray(value)) {
    return {
      type: "text",
      rows: Math.max(3, Math.min(value.length, 10)),
      useSelect: false,
      isJsonObject: false,
    };
  }

  // 如果是对象，使用展开的字段显示
  if (typeof value === "object" && value !== null) {
    return {
      type: "text",
      rows: undefined,
      useSelect: false,
      isJsonObject: true,
    };
  }

  // 如果是数字，使用 number 类型
  if (typeof value === "number") {
    return {
      type: "number",
      rows: undefined,
      useSelect: false,
      isJsonObject: false,
    };
  }

  // 其他类型使用单行
  return {
    type: "text",
    rows: undefined,
    useSelect: false,
    isJsonObject: false,
  };
};

export default function PagesTable() {
  const toast = useToast();
  const [data, setData] = useState<PageListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPages, setSelectedPages] = useState<(string | number)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPage, setDeletingPage] = useState<PageListItem | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false);
  const [batchNewStatus, setBatchNewStatus] = useState("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigateWithTransition();

  // 编辑页面状态
  const [formData, setFormData] = useState<PageFormState>({
    title: "",
    slug: "",
    status: "ACTIVE",
    contentType: "MARKDOWN",
    content: "",
    config: null,
    metaDescription: "",
    metaKeywords: "",
    robotsIndex: true,
  });

  // 快速编辑配置字段的引用集合
  const configFieldRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({});
  const [configSelectOverrides, setConfigSelectOverrides] = useState<
    Record<string, string>
  >({});

  const resetConfigEditingState = () => {
    configFieldRefs.current = {};
    setConfigSelectOverrides({});
  };

  // 处理表单字段变化
  const handleFieldChange = <K extends keyof PageFormState>(
    field: K,
    value: PageFormState[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const serializeConfigPath = (path: string[]): string => JSON.stringify(path);

  const deserializeConfigPath = (pathKey: string): string[] => {
    try {
      const parsed = JSON.parse(pathKey);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const registerConfigFieldRef =
    (path: string[]) =>
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      const key = serializeConfigPath(path);
      if (element) {
        configFieldRefs.current[key] = element;
      } else {
        delete configFieldRefs.current[key];
      }
    };

  const getConfigFieldSourceValue = (path: string[]): unknown => {
    if (!isConfigObject(formData.config)) {
      return undefined;
    }
    return getValueAtPath(formData.config, path);
  };

  const formatConfigValueForInput = (value: unknown): string => {
    if (value === undefined || value === null) {
      return "";
    }

    if (isDateString(value)) {
      const date = new Date(value as string);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.join("\n");
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  const getConfigFieldDisplayValue = (path: string[]): string => {
    const key = serializeConfigPath(path);
    if (configSelectOverrides[key] !== undefined) {
      return configSelectOverrides[key];
    }
    const value = getConfigFieldSourceValue(path);
    return formatConfigValueForInput(value);
  };

  const handleConfigSelectChange = (path: string[], value: string | number) => {
    const key = serializeConfigPath(path);
    setConfigSelectOverrides((prev) => ({
      ...prev,
      [key]: String(value),
    }));
  };

  const convertRawValueToConfigValue = (
    rawValue: string,
    originalValue: unknown,
  ): unknown => {
    if (typeof originalValue === "boolean") {
      const normalized = rawValue.trim().toLowerCase();
      return normalized === "true" || normalized === "1";
    }

    if (typeof originalValue === "number") {
      const numValue = Number(rawValue);
      return isNaN(numValue) ? 0 : numValue;
    }

    if (Array.isArray(originalValue)) {
      // 保留用户输入的确切内容，包括行尾空格和空行
      // 只有当输入为空时才返回空数组
      if (rawValue === "") {
        return [];
      }
      return rawValue.split("\n");
    }

    if (typeof originalValue === "string" && isDateString(originalValue)) {
      const date = new Date(rawValue);
      return isNaN(date.getTime()) ? rawValue : date.toISOString();
    }

    if (typeof originalValue === "object" && originalValue !== null) {
      try {
        return JSON.parse(rawValue);
      } catch {
        return rawValue;
      }
    }

    return rawValue;
  };

  const collectConfigInputValues = (): ConfigRecord | null => {
    if (!isConfigObject(formData.config)) {
      return formData.config ?? null;
    }

    const sourceConfig = formData.config as ConfigRecord;
    const updatedConfig = JSON.parse(
      JSON.stringify(sourceConfig),
    ) as ConfigRecord;
    let hasChanges = false;

    const applyValue = (pathKey: string, rawValue: string) => {
      const path = deserializeConfigPath(pathKey);
      if (path.length === 0) return;
      const originalValue = getValueAtPath(sourceConfig, path);
      const processedValue = convertRawValueToConfigValue(
        rawValue,
        originalValue,
      );
      setValueAtPath(updatedConfig, path, processedValue);
      if (
        JSON.stringify(originalValue ?? null) !==
        JSON.stringify(processedValue ?? null)
      ) {
        hasChanges = true;
      }
    };

    Object.entries(configFieldRefs.current).forEach(([pathKey, element]) => {
      if (!element) return;
      applyValue(pathKey, element.value);
    });

    Object.entries(configSelectOverrides).forEach(([pathKey, value]) => {
      applyValue(pathKey, value);
    });

    return hasChanges ? updatedConfig : sourceConfig;
  };

  // 渲染页面配置对象的树状结构字段（递归，参考 SettingsSheet 的 renderJsonFields）
  const renderPageConfigObjectFields = (
    basePath: string[],
    obj: Record<string, unknown>,
    level: number = 0,
  ): ReactElement[] => {
    const fields: ReactElement[] = [];
    const keys = Object.keys(obj);

    keys.forEach((key) => {
      const value = obj[key];
      const currentPath = [...basePath, key];
      const paddingStyle = level
        ? { paddingLeft: `${level * 1.25}rem` }
        : undefined;
      if (Array.isArray(value)) {
        fields.push(
          <div key={`${currentPath.join(".")}-array`} style={paddingStyle}>
            {renderConfigFieldInput(currentPath, value, `输入 ${key}`, key)}
          </div>,
        );
        return;
      }

      const isObject = isConfigObject(value);

      if (isObject) {
        fields.push(
          <div
            key={`${currentPath.join(".")}-object`}
            className="space-y-3"
            style={paddingStyle}
          >
            <div className="text-base font-semibold text-foreground">{key}</div>
            <div className="space-y-3">
              {renderPageConfigObjectFields(
                currentPath,
                value as Record<string, unknown>,
                level + 1,
              )}
            </div>
          </div>,
        );
      } else {
        fields.push(
          <div key={`${currentPath.join(".")}-input`} style={paddingStyle}>
            {renderConfigFieldInput(currentPath, value, `输入 ${key}`, key)}
          </div>,
        );
      }
    });

    return fields;
  };

  // 渲染单个配置字段的输入组件（类型感知）
  const configFormInstanceKey = editingPage
    ? `${editingPage.id ?? editingPage.slug}-config`
    : "config-new";

  const renderConfigFieldInput = (
    path: string[],
    value: unknown,
    placeholder: string = "",
    fieldLabel?: string,
  ): ReactElement => {
    const inputConfig = getPageConfigInputConfig(value);
    const labelText = fieldLabel || "配置值";
    const pathKey = serializeConfigPath(path);

    if (inputConfig.useSelect) {
      // 布尔值使用 Select 组件，并在上方显示键名
      return (
        <div className="space-y-2">
          <label className="block text-sm text-foreground">{labelText}</label>
          <Select
            value={getConfigFieldDisplayValue(path)}
            onChange={(val) => handleConfigSelectChange(path, val)}
            options={[
              { value: "true", label: "是" },
              { value: "false", label: "否" },
            ]}
            size="sm"
          />
        </div>
      );
    }

    if (inputConfig.isJsonObject && isConfigObject(value)) {
      // 对象类型在下方展开树状结构
      return (
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">{labelText}</div>
          <div className="space-y-3 pl-4">
            {renderPageConfigObjectFields(
              path,
              value as Record<string, unknown>,
            )}
          </div>
        </div>
      );
    }

    // 数组和其他类型使用 Input，并将键名作为 label
    return (
      <Input
        key={`${configFormInstanceKey}-${pathKey}`}
        label={labelText}
        type={inputConfig.type || "text"}
        defaultValue={formatConfigValueForInput(value)}
        size="sm"
        rows={inputConfig.rows}
        helperText={
          placeholder || `输入内容${inputConfig.rows ? "，每行一个项目" : ""}`
        }
        ref={registerConfigFieldRef(path)}
      />
    );
  };

  // 渲染页面配置的字段（专门为页面配置设计，只编辑 value 字段，使用类型感知渲染）
  const renderPageConfigFields = (): ReactElement[] => {
    const fields: ReactElement[] = [];
    const configSource = formData.config;
    if (!isConfigObject(configSource)) {
      return fields;
    }

    // 移除 blocks 列表渲染，使用独立编辑器
    // 移除 components 渲染

    return fields;
  };

  // 处理选中状态变化
  const handleSelectionChange = (selectedKeys: (string | number)[]) => {
    setSelectedPages(selectedKeys);
    console.log("选中的页面 ID:", selectedKeys);
  };

  // 打开编辑对话框
  const openEditDialog = (pageItem: PageListItem) => {
    setEditingPage(pageItem);
    setFormData({
      title: pageItem.title,
      slug: pageItem.slug,
      status: pageItem.status,
      contentType: pageItem.contentType,
      content: "",
      config: isConfigObject(pageItem.config)
        ? (pageItem.config as ConfigRecord)
        : null,
      metaDescription: pageItem.metaDescription || "",
      metaKeywords: pageItem.metaKeywords || "",
      robotsIndex: pageItem.robotsIndex,
    });
    resetConfigEditingState();
    setEditDialogOpen(true);
  };

  // 关闭编辑对话框
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingPage(null);
    resetConfigEditingState();
  };

  // 保存页面编辑
  const handleSavePage = async () => {
    if (!editingPage) return;

    setIsSubmitting(true);
    try {
      // 检查是否有变化
      const finalConfig = collectConfigInputValues();

      const hasChanges =
        formData.title !== editingPage.title ||
        (!editingPage.isSystemPage && formData.slug !== editingPage.slug) ||
        formData.status !== editingPage.status ||
        formData.contentType !== editingPage.contentType ||
        formData.metaDescription !== (editingPage.metaDescription || "") ||
        formData.metaKeywords !== (editingPage.metaKeywords || "") ||
        formData.robotsIndex !== editingPage.robotsIndex ||
        formData.content !== "" ||
        JSON.stringify(finalConfig ?? {}) !==
          JSON.stringify(editingPage.config || {});

      if (!hasChanges) {
        toast.info("没有字段被修改");
        setIsSubmitting(false);
        return;
      }

      const result = await runWithAuth(updatePage, {
        slug: editingPage.slug,
        title:
          formData.title !== editingPage.title ? formData.title : undefined,
        newSlug:
          !editingPage.isSystemPage && formData.slug !== editingPage.slug
            ? formData.slug
            : undefined,
        status:
          formData.status !== editingPage.status
            ? (formData.status as "ACTIVE" | "SUSPENDED")
            : undefined,
        contentType:
          formData.contentType !== editingPage.contentType
            ? formData.contentType
            : undefined,
        content: formData.content ? formData.content : undefined,
        config:
          JSON.stringify(finalConfig ?? {}) !==
          JSON.stringify(editingPage.config || {})
            ? (finalConfig ?? undefined)
            : undefined,
        metaDescription:
          formData.metaDescription !== (editingPage.metaDescription || "")
            ? formData.metaDescription
            : undefined,
        metaKeywords:
          formData.metaKeywords !== (editingPage.metaKeywords || "")
            ? formData.metaKeywords
            : undefined,
        robotsIndex:
          formData.robotsIndex !== editingPage.robotsIndex
            ? formData.robotsIndex
            : undefined,
      });

      if (result && "data" in result && result.data) {
        toast.success(`页面 "${editingPage.title}" 已更新`);
        closeEditDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error("操作失败");
      }
    } catch (error) {
      console.error("更新页面失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开删除单个页面对话框
  const openDeleteDialog = (pageItem: PageListItem) => {
    if (pageItem.isSystemPage) {
      toast.error("系统页面不允许删除");
      return;
    }
    setDeletingPage(pageItem);
    setDeleteDialogOpen(true);
  };

  // 关闭删除对话框
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingPage(null);
  };

  // 确认删除单个页面
  const handleConfirmDelete = async () => {
    if (!deletingPage) return;

    setIsSubmitting(true);
    try {
      const result = await runWithAuth(deletePages, {
        ids: [deletingPage.id],
      });

      if (result && "data" in result && result.data) {
        toast.success(`页面 "${deletingPage.title}" 已删除`);
        closeDeleteDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error("操作失败");
      }
    } catch (error) {
      console.error("删除页面失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开批量删除对话框
  const openBatchDeleteDialog = () => {
    // 检查是否包含系统页面
    const selectedItems = data.filter((item) =>
      selectedPages.includes(item.id),
    );
    const systemPages = selectedItems.filter((item) => item.isSystemPage);

    if (systemPages.length > 0) {
      toast.error(
        `选中的页面包含 ${systemPages.length} 个系统页面，系统页面不允许删除`,
      );
      return;
    }

    setBatchDeleteDialogOpen(true);
  };

  // 关闭批量删除对话框
  const closeBatchDeleteDialog = () => {
    setBatchDeleteDialogOpen(false);
  };

  // 确认批量删除
  const handleConfirmBatchDelete = async () => {
    setIsSubmitting(true);
    try {
      const result = await runWithAuth(deletePages, {
        ids: selectedPages.map((id) => String(id)),
      });

      if (result && "data" in result && result.data) {
        toast.success(`已删除 ${result.data?.deleted || 0} 个页面`);
        closeBatchDeleteDialog();
        setRefreshTrigger((prev) => prev + 1);
        setSelectedPages([]);
      } else {
        toast.error("操作失败");
      }
    } catch (error) {
      console.error("批量删除失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开批量更改状态对话框
  const openBatchStatusDialog = () => {
    setBatchStatusDialogOpen(true);
  };

  // 关闭批量更改状态对话框
  const closeBatchStatusDialog = () => {
    setBatchStatusDialogOpen(false);
  };

  // 确认批量更改状态
  const handleConfirmBatchStatus = async () => {
    setIsSubmitting(true);
    try {
      const result = await runWithAuth(updatePages, {
        ids: selectedPages.map((id) => String(id)),
        status: batchNewStatus as "ACTIVE" | "SUSPENDED",
      });

      if (result && "data" in result && result.data) {
        toast.success(`已更新 ${result.data?.updated || 0} 个页面的状态`);
        closeBatchStatusDialog();
        setRefreshTrigger((prev) => prev + 1);
        setSelectedPages([]);
      } else {
        toast.error("操作失败");
      }
    } catch (error) {
      console.error("批量更改状态失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 批量操作按钮
  const batchActions: ActionButton[] = [
    {
      label: "更改状态",
      onClick: openBatchStatusDialog,
      icon: <RiEditLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "删除",
      onClick: openBatchDeleteDialog,
      icon: <RiDeleteBinLine size="1em" />,
      variant: "danger",
    },
  ];

  // 行操作按钮
  const rowActions = (record: PageListItem): ActionButton[] => [
    {
      label: "查看页面",
      onClick: () => {
        const url = record.slug.startsWith("/")
          ? record.slug
          : `/${record.slug}`;
        window.open(url, "_blank");
      },
      icon: <RiExternalLinkLine size="1em" />,
      variant: "ghost",
    },
    {
      label: record.isSystemPage ? "布局编辑器" : "编辑页面",
      onClick: () => navigate("/admin/pages/" + record.id),
      icon: <RiFileEditLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "快速编辑",
      onClick: () => openEditDialog(record),
      icon: <RiEditLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "删除",
      onClick: () => openDeleteDialog(record),
      icon: <RiDeleteBinLine size="1em" />,
      variant: "danger",
      disabled: record.isSystemPage, // 系统页面不允许删除
    },
  ];

  // 处理排序变化
  const handleSortChange = (key: string, order: "asc" | "desc" | null) => {
    setSortKey(order ? key : null);
    setSortOrder(order);
    setPage(1);
  };

  // 处理搜索变化
  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
    setPage(1);
  };

  // 处理筛选变化
  const handleFilterChange = (
    filters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    >,
  ) => {
    setFilterValues(filters);
    setPage(1); // 筛选变化时重置到第一页
  };

  // 筛选配置
  const filterConfig: FilterConfig[] = [
    {
      key: "status",
      label: "状态",
      type: "checkboxGroup",
      options: [
        { value: "ACTIVE", label: "已激活" },
        { value: "SUSPENDED", label: "已暂停" },
      ],
    },
    {
      key: "isSystemPage",
      label: "页面类型",
      type: "checkboxGroup",
      options: [
        { value: "true", label: "系统页面" },
        { value: "false", label: "自定义页面" },
      ],
    },
    {
      key: "robotsIndex",
      label: "搜索引擎索引",
      type: "checkboxGroup",
      options: [
        { value: "true", label: "允许索引" },
        { value: "false", label: "禁止索引" },
      ],
    },
    {
      key: "createdAt",
      label: "创建时间",
      type: "dateRange",
      dateFields: { start: "createdAtStart", end: "createdAtEnd" },
    },
    {
      key: "updatedAt",
      label: "更新时间",
      type: "dateRange",
      dateFields: { start: "updatedAtStart", end: "updatedAtEnd" },
    },
  ];

  // 监听广播刷新消息
  useBroadcast<{ type: string }>((message) => {
    if (message.type === "pages-refresh") {
      setRefreshTrigger((prev) => prev + 1);
    }
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params: {
          page: number;
          pageSize: number;
          sortBy?: "id" | "title" | "slug" | "createdAt" | "updatedAt";
          sortOrder?: "asc" | "desc";
          search?: string;
          status?: ("ACTIVE" | "SUSPENDED")[];
          isSystemPage?: boolean[];
          robotsIndex?: boolean[];
          createdAtStart?: string;
          createdAtEnd?: string;
          updatedAtStart?: string;
          updatedAtEnd?: string;
        } = {
          page,
          pageSize,
        };

        if (sortKey && sortOrder) {
          params.sortBy = sortKey as
            | "id"
            | "title"
            | "slug"
            | "createdAt"
            | "updatedAt";
          params.sortOrder = sortOrder;
        }

        if (searchQuery && searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        // 添加筛选参数
        if (filterValues.status && Array.isArray(filterValues.status)) {
          const statusFilter = (filterValues.status as string[]).filter(
            (status): status is "ACTIVE" | "SUSPENDED" =>
              status === "ACTIVE" || status === "SUSPENDED",
          );
          if (statusFilter.length > 0) {
            params.status = statusFilter;
          }
        }

        if (
          filterValues.isSystemPage &&
          Array.isArray(filterValues.isSystemPage)
        ) {
          params.isSystemPage = filterValues.isSystemPage.map((v) =>
            typeof v === "string" ? v === "true" : Boolean(v),
          );
        }

        if (
          filterValues.robotsIndex &&
          Array.isArray(filterValues.robotsIndex)
        ) {
          params.robotsIndex = filterValues.robotsIndex.map((v) =>
            typeof v === "string" ? v === "true" : Boolean(v),
          );
        }

        if (
          filterValues.createdAt &&
          typeof filterValues.createdAt === "object"
        ) {
          const dateRange = filterValues.createdAt as {
            start?: string;
            end?: string;
          };
          if (dateRange.start) {
            params.createdAtStart = dateRange.start;
          }
          if (dateRange.end) {
            params.createdAtEnd = dateRange.end;
          }
        }

        if (
          filterValues.updatedAt &&
          typeof filterValues.updatedAt === "object"
        ) {
          const dateRange = filterValues.updatedAt as {
            start?: string;
            end?: string;
          };
          if (dateRange.start) {
            params.updatedAtStart = dateRange.start;
          }
          if (dateRange.end) {
            params.updatedAtEnd = dateRange.end;
          }
        }

        const result = await runWithAuth(getPagesList, {
          ...params,
          sortBy: params.sortBy || "id",
          sortOrder: params.sortOrder || "desc",
        });

        if (result && "data" in result && result.data) {
          setData(result.data);
          setTotalRecords(result.meta?.total || 0);
          if (result.meta) {
            setTotalPages(result.meta.totalPages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch pages list:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    page,
    pageSize,
    sortKey,
    sortOrder,
    searchQuery,
    filterValues,
    refreshTrigger,
  ]);

  const columns: TableColumn<PageListItem>[] = [
    {
      key: "id",
      title: "ID",
      dataIndex: "id",
      align: "left",
      sortable: true,
      mono: true,
    },
    {
      key: "title",
      title: "标题",
      dataIndex: "title",
      align: "left",
      sortable: true,
      render: (value: unknown, record: PageListItem) => {
        return (
          <span className={record.isSystemPage ? "font-medium" : ""}>
            {String(value)}
          </span>
        );
      },
    },
    {
      key: "isSystemPage",
      title: "页面类型",
      dataIndex: "isSystemPage",
      align: "center",
      render: (value: unknown) => {
        return value === true ? <span>系统</span> : <span>自定义</span>;
      },
    },
    {
      key: "slug",
      title: "路径",
      dataIndex: "slug",
      align: "left",
      sortable: true,
      mono: true,
    },
    {
      key: "author",
      title: "作者",
      dataIndex: "author",
      align: "left",
      render: (value: unknown, record: PageListItem) => {
        const author = record.author;
        return author?.username ? (
          <span>{author.nickname || `@${author.username}`}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "status",
      title: "状态",
      dataIndex: "status",
      align: "center",
      render: (value: unknown) => {
        const status = String(value);
        const colorClass =
          status === "ACTIVE"
            ? "bg-success/20 text-success"
            : "bg-muted/20 text-muted-foreground";
        const statusText = status === "ACTIVE" ? "已激活" : "已暂停";
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${colorClass}`}
          >
            {statusText}
          </span>
        );
      },
    },
    {
      key: "robotsIndex",
      title: "索引",
      dataIndex: "robotsIndex",
      align: "center",
      render: (value: unknown) => {
        return value === true ? (
          <span className="flex justify-center">
            <RiCheckLine size="1.5em" />
          </span>
        ) : (
          <span className="flex justify-center">
            <RiCloseLine size="1.5em" className="text-muted-foreground" />
          </span>
        );
      },
    },
    {
      key: "createdAt",
      title: "创建时间",
      dataIndex: "createdAt",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (typeof value === "string") {
          return new Date(value).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        return "-";
      },
    },
    {
      key: "updatedAt",
      title: "更新时间",
      dataIndex: "updatedAt",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (typeof value === "string") {
          return new Date(value).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        return "-";
      },
    },
  ];

  const statusOptions: SelectOption[] = [
    { value: "ACTIVE", label: "激活" },
    { value: "SUSPENDED", label: "暂停" },
  ];

  const contentTypeOptions: SelectOption[] = [
    { value: "MARKDOWN", label: "Markdown" },
    { value: "HTML", label: "HTML" },
    { value: "MDX", label: "MDX" },
  ];

  return (
    <>
      <GridTable
        title="页面列表"
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
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
        searchPlaceholder="搜索标题、路径或描述..."
        filterConfig={filterConfig}
        onFilterChange={handleFilterChange}
        striped
        hoverable
        bordered={false}
        size="sm"
        emptyText="暂无页面记录"
        stickyHeader
        maxHeight="100%"
        padding={2.5}
        enableActions={true}
        batchActions={batchActions}
        rowActions={rowActions}
        onSelectionChange={handleSelectionChange}
        onRowClick={(record) => openEditDialog(record)}
      />

      {/* 编辑页面对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        title={`快速编辑 - ${editingPage?.title || ""}`}
        size="lg"
      >
        <div className="px-6 py-6 space-y-8">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                基本信息
              </h3>
              <p className="text-sm text-muted-foreground">
                页面标题、SEO设置与路径配置。
              </p>
            </div>
            <div className="space-y-4">
              <Input
                label="标题"
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                required
                size="sm"
                helperText="页面标题，也用于SEO标题"
              />
              <Input
                label="SEO 描述"
                value={formData.metaDescription}
                onChange={(e) =>
                  handleFieldChange("metaDescription", e.target.value)
                }
                rows={2}
                size="sm"
                helperText="用于搜索引擎结果展示，也作为页面摘要"
              />
              <Input
                label="SEO 关键词"
                value={formData.metaKeywords}
                onChange={(e) =>
                  handleFieldChange("metaKeywords", e.target.value)
                }
                size="sm"
                helperText="多个关键词用逗号分隔"
              />
              <Checkbox
                label="允许搜索引擎索引"
                checked={formData.robotsIndex}
                onChange={(e) =>
                  handleFieldChange("robotsIndex", e.target.checked)
                }
              />
              {!editingPage?.isSystemPage && (
                <div className="space-y-2">
                  <Input
                    label="路径"
                    value={formData.slug}
                    onChange={(e) => handleFieldChange("slug", e.target.value)}
                    required
                    size="sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    更改路径可能会影响搜索引擎收录和已有的外部链接，请谨慎修改。
                  </p>
                </div>
              )}
            </div>
          </section>

          {editingPage?.isSystemPage ? (
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  页面配置
                </h3>
              </div>
              {isConfigObject(formData.config) &&
              Object.keys(formData.config).length > 0 ? (
                <>
                  <div className="space-y-6">{renderPageConfigFields()}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {(() => {
                        const summarySource = formData.config;
                        if (!summarySource) {
                          return "暂无可编辑配置";
                        }
                        const blocksValue = (summarySource as ConfigRecord)
                          .blocks as unknown;
                        const blocksCount = Array.isArray(blocksValue)
                          ? blocksValue.length
                          : 0;
                        return `${blocksCount} 个区块`;
                      })()}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  该系统页面暂未提供可快速编辑的配置。
                </p>
              )}
            </section>
          ) : (
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  内容设置
                </h3>
                <p className="text-sm text-muted-foreground">
                  选择内容类型后直接在下方输入正文。
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm text-foreground">
                    内容类型
                  </label>
                  <Select
                    value={formData.contentType}
                    onChange={(value) =>
                      handleFieldChange(
                        "contentType",
                        value as PageFormState["contentType"],
                      )
                    }
                    options={contentTypeOptions}
                    size="sm"
                  />
                </div>
                <Input
                  label="页面内容"
                  value={formData.content}
                  onChange={(e) => handleFieldChange("content", e.target.value)}
                  rows={8}
                  size="sm"
                  helperText={
                    formData.contentType === "MARKDOWN"
                      ? "输入 Markdown 内容..."
                      : "输入 HTML 内容..."
                  }
                />
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                发布设置
              </h3>
              <p className="text-sm text-muted-foreground">
                控制页面在前台是否展示。
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-foreground">状态</label>
              <Select
                value={formData.status}
                onChange={(value) =>
                  handleFieldChange("status", value as PageFormState["status"])
                }
                options={statusOptions}
                size="sm"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                激活：页面将在前台显示 <br />
                暂停：页面将不会显示，也无法被索引
              </p>
            </div>
          </section>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeEditDialog}
              size="sm"
              disabled={isSubmitting}
            />
            <Button
              label="保存"
              variant="primary"
              onClick={handleSavePage}
              size="sm"
              loading={isSubmitting}
              loadingText="保存中..."
            />
          </div>
        </div>
      </Dialog>

      {/* 批量更改状态对话框 */}
      <Dialog
        open={batchStatusDialogOpen}
        onClose={closeBatchStatusDialog}
        title="批量更改状态"
        size="sm"
      >
        <div className="px-6 py-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            将为选中的 {selectedPages.length} 个页面更改状态
          </p>
          <div>
            <label className="block text-sm text-foreground mb-2">新状态</label>
            <Select
              value={batchNewStatus}
              onChange={(value) => setBatchNewStatus(value as string)}
              options={statusOptions}
              size="sm"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            激活：页面将在前台显示 <br />
            暂停：页面将不会显示，也无法被索引
          </p>
          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeBatchStatusDialog}
              size="sm"
              disabled={isSubmitting}
            />
            <Button
              label="确认"
              variant="primary"
              onClick={handleConfirmBatchStatus}
              size="sm"
              loading={isSubmitting}
              loadingText="更新中..."
            />
          </div>
        </div>
      </Dialog>

      {/* 删除单个页面确认对话框 */}
      <AlertDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="确认删除页面"
        description={
          deletingPage ? `确定要删除页面 "${deletingPage.title}" 吗？` : ""
        }
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={isSubmitting}
      />

      {/* 批量删除确认对话框 */}
      <AlertDialog
        open={batchDeleteDialogOpen}
        onClose={closeBatchDeleteDialog}
        onConfirm={handleConfirmBatchDelete}
        title="确认批量删除"
        description={`确定要删除选中的 ${selectedPages.length} 个页面吗？`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={isSubmitting}
      />
    </>
  );
}
