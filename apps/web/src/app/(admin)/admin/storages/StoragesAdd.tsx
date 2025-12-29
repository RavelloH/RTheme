"use client";

import { useState } from "react";
import { GridItem } from "@/components/RowGrid";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Select, SelectOption } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import runWithAuth from "@/lib/client/run-with-auth";
import { createStorage } from "@/actions/storage";
import { StorageProviderType } from "@/template/storages";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import { RiServerFill } from "@remixicon/react";
import {
  StorageConfigFields,
  StorageConfigValues,
  createStorageConfigValues,
  storageConfigValuesToPayload,
} from "./StorageConfigFields";
import Link from "@/components/Link";

interface StorageFormState {
  name: string;
  displayName: string;
  type: StorageProviderType;
  baseUrl: string;
  isActive: boolean;
  isDefault: boolean;
  maxFileSize: number;
  pathTemplate: string;
  config: StorageConfigValues;
}

const STORAGE_TYPE_OPTIONS: SelectOption[] = [
  { value: "LOCAL", label: "本地存储" },
  { value: "AWS_S3", label: "AWS S3" },
  { value: "GITHUB_PAGES", label: "GitHub Pages" },
  { value: "VERCEL_BLOB", label: "Vercel Blob" },
];

function createInitialFormState(
  type: StorageProviderType = "LOCAL",
): StorageFormState {
  return {
    name: "",
    displayName: "",
    type,
    baseUrl: "",
    isActive: true,
    isDefault: false,
    maxFileSize: 52_428_800,
    pathTemplate: "/{year}/{month}/{filename}",
    config: createStorageConfigValues(type),
  };
}

export default function StoragesAdd() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<StorageFormState>(() =>
    createInitialFormState(),
  );
  const [submitting, setSubmitting] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const { broadcast } = useBroadcastSender<{ type: "storages-refresh" }>();

  const openDialog = () => {
    setFormData(createInitialFormState());
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
  };

  const handleTypeChange = (value: string | number) => {
    const nextType = value as StorageProviderType;
    setFormData((prev) => ({
      ...prev,
      type: nextType,
      config: createStorageConfigValues(nextType),
    }));
  };

  const handleConfigValueChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  const handleCreateStorage = async () => {
    if (!formData.name.trim()) {
      toastError("名称不能为空");
      return;
    }
    if (!formData.displayName.trim()) {
      toastError("显示名称不能为空");
      return;
    }
    if (!formData.baseUrl.trim()) {
      toastError("基础 URL 不能为空");
      return;
    }

    const parsedConfig = storageConfigValuesToPayload(formData.config);

    setSubmitting(true);
    try {
      const result = await runWithAuth(createStorage, {
        name: formData.name.trim(),
        type: formData.type,
        displayName: formData.displayName.trim(),
        baseUrl: formData.baseUrl.trim(),
        isActive: formData.isActive,
        isDefault: formData.isDefault,
        maxFileSize: formData.maxFileSize,
        pathTemplate:
          formData.pathTemplate.trim() || "/{year}/{month}/{filename}",
        config: parsedConfig,
      });

      if (result && "data" in result && result.success) {
        toastSuccess("存储提供商已创建", formData.displayName.trim());
        await broadcast({ type: "storages-refresh" });
        setDialogOpen(false);
      } else {
        const message =
          result && "message" in result && typeof result.message === "string"
            ? result.message
            : "创建存储失败";
        toastError(message);
      }
    } catch (error) {
      console.error("创建存储服务提供商失败:", error);
      toastError("创建存储失败", "请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <GridItem areas={[7, 8]} width={6} height={0.2}>
        <button
          type="button"
          onClick={openDialog}
          className="h-full w-full flex gap-2 items-center justify-center text-2xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
        >
          <RiServerFill size="1.1em" /> 添加存储服务提供商
        </button>
      </GridItem>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title="添加存储服务提供商"
        size="lg"
      >
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                服务商类型
              </label>
              <div className="mt-2">
                <Select
                  value={formData.type}
                  onChange={handleTypeChange}
                  options={STORAGE_TYPE_OPTIONS}
                  className="w-full"
                  size="sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="内部名称"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              size="sm"
              helperText="用于系统标识，应唯一"
            />
            <Input
              label="显示名称"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  displayName: e.target.value,
                }))
              }
              required
              size="sm"
              helperText="展示给其他管理员的名称"
            />
          </div>

          <Input
            label="基础 URL"
            value={formData.baseUrl}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, baseUrl: e.target.value }))
            }
            required
            size="sm"
            helperText="用于最终访问文件的域名或路径前缀"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="最大文件大小（字节）"
              type="number"
              value={formData.maxFileSize}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxFileSize: Number(e.target.value) || 0,
                }))
              }
              size="sm"
              helperText="默认 52428800 = 50MB"
              min={0}
            />
            <Input
              label="路径模板"
              value={formData.pathTemplate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  pathTemplate: e.target.value,
                }))
              }
              size="sm"
              helperText="可用变量：{year}/{month}/{day}/{filename}"
            />
          </div>

          <div className="space-y-4">
            <Switch
              label="激活该存储"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
            <br />
            <Switch
              label="设为默认存储"
              checked={formData.isDefault}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isDefault: checked }))
              }
            />
          </div>

          <div className="space-y-4">
            <div className="text-xl font-semibold text-foreground/90">
              配置项
            </div>
            <p>
              有关各存储提供商的详细配置说明，请参阅文档：
              <Link
                href="https://docs.ravelloh.com/docs/storage"
                className="text-primary ml-auto"
                presets={["hover-underline", "arrow-out"]}
              >
                https://docs.ravelloh.com/docs/storage
              </Link>
            </p>
            <StorageConfigFields
              type={formData.type}
              values={formData.config}
              onChange={handleConfigValueChange}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeDialog}
              size="sm"
              disabled={submitting}
            />
            <Button
              label="创建"
              variant="primary"
              onClick={handleCreateStorage}
              size="sm"
              loading={submitting}
              loadingText="创建中..."
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
