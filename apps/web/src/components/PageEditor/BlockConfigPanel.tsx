import React, { useEffect, useState } from "react";
import type { BlockConfig } from "@/blocks/types";
import type {
  FieldConfig,
  SelectFieldConfig,
} from "@/blocks/types/field-config";
import { getBlockFormConfig } from "@/blocks/registry";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import { Button } from "@/ui/Button";
import { AlertDialog } from "@/ui/AlertDialog";
import { RiRefreshLine, RiDeleteBinLine } from "@remixicon/react";
import type { BlockFormConfig } from "@/blocks/types/field-config";
import Link from "../Link";

// Helper to safe access nested objects
const get = (obj: unknown, path: string, def?: unknown) => {
  if (!obj || typeof obj !== "object") {
    return def;
  }

  const keys = path.split(".");
  let result: unknown = obj;

  for (const key of keys) {
    if (
      result &&
      typeof result === "object" &&
      key in (result as Record<string, unknown>)
    ) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return def;
    }
  }

  return result !== undefined ? result : def;
};

// Helper to set nested objects (immutable)
const set = (obj: unknown, path: string, value: unknown) => {
  const keys = path.split(".");
  const newObj = JSON.parse(JSON.stringify(obj || {}));
  let current = newObj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!current[key]) current[key] = {};
    current = current[key];
  }
  current[keys[keys.length - 1]!] = value;
  return newObj;
};

/**
 * 字段渲染器组件
 * 根据字段配置动态渲染对应的输入控件
 */
function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const handleChange = (newValue: unknown) => {
    onChange(newValue);
  };

  switch (field.type) {
    case "textarea": {
      return (
        <Input
          label={field.label}
          value={String(value ?? "")}
          onChange={(e) => handleChange(e.target.value)}
          rows={3}
          helperText={field.helperText}
          placeholder={field.placeholder}
          size="sm"
          disabled={field.disabled}
        />
      );
    }

    case "text":
    case "number":
    case "date": {
      return (
        <Input
          label={field.label}
          value={String(value ?? "")}
          onChange={(e) =>
            handleChange(
              field.type === "number"
                ? parseFloat(e.target.value) || 0
                : e.target.value,
            )
          }
          type={
            field.type === "number" || field.type === "date"
              ? field.type
              : "text"
          }
          helperText={field.helperText}
          placeholder={field.placeholder}
          size="sm"
          disabled={field.disabled}
        />
      );
    }

    case "array": {
      // 数组类型：使用 textarea，每行一个元素
      const strValue = Array.isArray(value)
        ? value.join("\n")
        : String(value ?? "");
      return (
        <Input
          label={field.label}
          value={strValue}
          onChange={(e) => handleChange(e.target.value.split("\n"))}
          rows={4}
          helperText={
            field.helperText || field.separatorHint || "One item per line"
          }
          placeholder={field.placeholder}
          size="sm"
          disabled={field.disabled}
        />
      );
    }

    case "select": {
      const selectField = field as SelectFieldConfig;
      return (
        <div className="mt-6">
          <label className="text-sm text-foreground mb-2 block">
            {field.label}
          </label>
          <Select
            value={String(value ?? "")}
            onChange={(val) => handleChange(val)}
            options={selectField.options}
            placeholder={field.placeholder || "请选择"}
            size="sm"
            disabled={field.disabled}
            className="w-full"
          />
          {field.helperText && (
            <p className="text-xs text-muted-foreground mt-1">
              {field.helperText}
            </p>
          )}
        </div>
      );
    }

    case "toggle": {
      return (
        <div className="mt-6 flex items-center gap-3">
          <Switch
            label={field.label}
            checked={Boolean(value)}
            onCheckedChange={handleChange}
            disabled={field.disabled}
            size="sm"
          />
          {field.helperText && (
            <p className="text-xs text-muted-foreground">{field.helperText}</p>
          )}
        </div>
      );
    }

    default: {
      const _exhaustiveCheck: never = field;
      return (
        <div className="text-xs text-muted-foreground">
          不支持的字段类型: {(field as FieldConfig).type}
        </div>
      );
    }
  }
}

export default function BlockConfigPanel({
  block,
  onUpdate,
  onRefreshData,
  onDelete,
}: {
  block: BlockConfig | null;
  onUpdate: (updates: Partial<BlockConfig>) => void;
  onRefreshData?: () => Promise<void>;
  onDelete?: () => void;
}) {
  const [formConfig, setFormConfig] = useState<BlockFormConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 使用 ref 跟踪之前的 block 类型，避免不必要的重新加载
  const prevBlockTypeRef = React.useRef<string | null>(null);

  // 异步加载表单配置
  useEffect(() => {
    if (!block) {
      setFormConfig(null);
      prevBlockTypeRef.current = null;
      return;
    }

    const currentBlockType = block.block || null;

    // 只有当 block 类型变化时才重新加载配置
    if (currentBlockType === prevBlockTypeRef.current) {
      return;
    }

    prevBlockTypeRef.current = currentBlockType;

    setIsLoading(true);
    getBlockFormConfig(currentBlockType || "")
      .then((config) => {
        setFormConfig(config);
      })
      .catch((error) => {
        console.error("Failed to load block form config:", error);
        setFormConfig(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [block]);

  // 处理刷新数据
  const handleRefreshData = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // 处理删除确认
  const handleDeleteConfirm = () => {
    setShowDeleteDialog(true);
  };

  if (!block) {
    return (
      <div className="w-80 bg-card p-6 flex flex-col items-center justify-center text-muted-foreground text-sm">
        选择一个区块以编辑属性
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-80 bg-card p-6 flex flex-col items-center justify-center text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
        <p>加载配置中...</p>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="w-80 bg-card p-6 flex flex-col items-center justify-center text-muted-foreground text-sm">
        <p>未找到 &quot;{block.block}&quot; 的配置</p>
        <p className="text-xs mt-2">
          请在该 block 的 schema 文件中定义表单配置
        </p>
      </div>
    );
  }

  const handleContentChange = (path: string, value: unknown) => {
    const newContent = set(block.content, path, value);
    onUpdate({ content: newContent });
  };

  const handleMetaChange = (field: string, value: string) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="w-full flex flex-col">
      <div className="space-y-4">
        <div className="flex items-center justify-between py-4 border-b border-border">
          <h3 className="text-lg">编辑区块</h3>
          <div className="flex items-center gap-2">
            {onRefreshData && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RiRefreshLine size={16} />}
                label="更新数据"
                onClick={handleRefreshData}
                loading={isRefreshing}
                disabled={isLoading}
              />
            )}
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                icon={<RiDeleteBinLine size={16} />}
                label="删除"
                onClick={handleDeleteConfirm}
                disabled={isLoading || isRefreshing}
              />
            )}
          </div>
        </div>

        {/* 区块信息 */}
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
          区块信息
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">区块类型</label>
            <p className="text-sm font-mono">{formConfig.blockType}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">区块名称</label>
            <p className="text-sm font-mono">{formConfig.displayName}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">区块作者</label>
            <p className="text-sm font-mono">
              {formConfig.author ? (
                formConfig.author.url ? (
                  <Link
                    presets={["hover-underline"]}
                    href={formConfig.author.url}
                  >
                    @{formConfig.author.name}
                  </Link>
                ) : (
                  "@" + formConfig.author.name
                )
              ) : (
                "未知"
              )}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              区块所属主题
            </label>
            <p className="text-sm font-mono">
              {formConfig.theme ? (
                formConfig.theme.url ? (
                  <Link
                    presets={["hover-underline"]}
                    href={formConfig.theme.url}
                  >
                    {formConfig.theme.name}
                  </Link>
                ) : (
                  formConfig.theme.name
                )
              ) : (
                "未知"
              )}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">配置量</label>
            <p className="text-sm">
              {formConfig.fields.length}个配置项，
              {formConfig.groups?.length + "个分组" || "未分组 "}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">性能影响</label>
            <p className="text-sm">
              {formConfig.actions?.db || 0} DB 查询，
              {formConfig.actions?.config || 0} 配置查询
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="text-sm text-muted-foreground">区块描述</label>
            <p className="text-sm font-mono whitespace-pre-wrap">
              {formConfig.description}
            </p>
          </div>
        </div>
        <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 py-2">
          区块配置
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* 通用元数据 */}
        <div className="space-y-4">
          <Input
            label="备注"
            value={block.description || ""}
            onChange={(e) => handleMetaChange("description", e.target.value)}
            size="sm"
            helperText="用于在编辑器中标识此区块"
          />
        </div>

        <hr className="border-border" />

        {/* 按分组渲染字段 */}
        {formConfig.groups && formConfig.groups.length > 0 ? (
          <>
            {formConfig.groups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{group.title}</label>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                  </div>
                  {formConfig.fields
                    .filter((field) => group.fields.includes(field.path))
                    .map((field, fieldIndex) => {
                      const value = get(block.content, field.path);
                      return (
                        <FieldRenderer
                          key={`${groupIndex}-${fieldIndex}`}
                          field={field}
                          value={value}
                          onChange={(newValue) =>
                            handleContentChange(field.path, newValue)
                          }
                        />
                      );
                    })}
                </div>
                {groupIndex < formConfig.groups!.length - 1 && (
                  <hr className="border-border" />
                )}
              </React.Fragment>
            ))}

            {/* 渲染未分组的字段 */}
            {(() => {
              // 收集所有分组中包含的字段路径
              const groupedFieldPaths = new Set<string>();
              formConfig.groups?.forEach((group) => {
                group.fields.forEach((fieldPath) => {
                  groupedFieldPaths.add(fieldPath);
                });
              });

              // 找出未分组的字段
              const ungroupedFields = formConfig.fields.filter(
                (field) => !groupedFieldPaths.has(field.path),
              );

              if (ungroupedFields.length > 0) {
                return (
                  <>
                    <hr className="border-border" />
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">其他配置</label>
                        <p className="text-xs text-muted-foreground">
                          未分组的配置项
                        </p>
                      </div>
                      {ungroupedFields.map((field, index) => {
                        const value = get(block.content, field.path);
                        return (
                          <FieldRenderer
                            key={`ungrouped-${index}`}
                            field={field}
                            value={value}
                            onChange={(newValue) =>
                              handleContentChange(field.path, newValue)
                            }
                          />
                        );
                      })}
                    </div>
                  </>
                );
              }
              return null;
            })()}
          </>
        ) : (
          /* 无分组时直接渲染所有字段 */
          <div className="space-y-4">
            {formConfig.fields.map((field, index) => {
              const value = get(block.content, field.path);
              return (
                <FieldRenderer
                  key={index}
                  field={field}
                  value={value}
                  onChange={(newValue) =>
                    handleContentChange(field.path, newValue)
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {onDelete && (
        <AlertDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => {
            setShowDeleteDialog(false);
            onDelete();
          }}
          title="删除区块"
          description={`确定要删除此区块吗？此操作无法撤销。\n\n区块类型：${block.block || "未知"}\n备注：${block.description || "无"}`}
          confirmText="确认删除"
          cancelText="取消"
          variant="danger"
        />
      )}
    </div>
  );
}
