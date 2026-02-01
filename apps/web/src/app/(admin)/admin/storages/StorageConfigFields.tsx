"use client";

import type {
  StorageConfigTemplate,
  StorageProviderType,
} from "@/template/storages";
import { STORAGE_PROVIDER_CONFIG_TEMPLATES } from "@/template/storages";
import { Input } from "@/ui/Input";

export type StorageConfigValues = Record<string, string>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatConfigInputValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
};

export function createStorageConfigValues(
  type: StorageProviderType,
  source?: Record<string, unknown> | null,
): StorageConfigValues {
  const template = STORAGE_PROVIDER_CONFIG_TEMPLATES[type] || {};
  const values: StorageConfigValues = {};

  Object.entries(template).forEach(([key, item]) => {
    const sourceValue =
      isRecord(source) && key in source ? source[key] : item.value;
    values[key] = formatConfigInputValue(sourceValue);
  });

  if (isRecord(source)) {
    Object.entries(source).forEach(([key, value]) => {
      if (!(key in values)) {
        values[key] = formatConfigInputValue(value);
      }
    });
  }

  return values;
}

export function storageConfigValuesToPayload(
  values: StorageConfigValues,
): Record<string, string> {
  const payload: Record<string, string> = {};
  Object.entries(values || {}).forEach(([key, value]) => {
    payload[key] = value ?? "";
  });
  return payload;
}

interface StorageConfigFieldsProps {
  type: StorageProviderType;
  values: StorageConfigValues;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}

export function StorageConfigFields({
  type,
  values,
  onChange,
  disabled = false,
}: StorageConfigFieldsProps) {
  const template = STORAGE_PROVIDER_CONFIG_TEMPLATES[type] || {};
  const extraKeys = Object.keys(values || {}).filter(
    (key) => !(key in template),
  );

  const renderInputs = (configTemplate: StorageConfigTemplate) =>
    Object.entries(configTemplate).map(([key, item]) => (
      <Input
        key={`config-field-${key}`}
        label={`${key}${item.required ? " *" : ""}`}
        value={values?.[key] ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
        size="sm"
        helperText={item.description}
        disabled={disabled}
      />
    ));

  return (
    <div className="space-y-4">
      {renderInputs(template)}

      {extraKeys.length > 0 && (
        <div className="space-y-3 border-t border-foreground/10 pt-4">
          <div className="text-sm text-muted-foreground">其他配置</div>
          {extraKeys.map((key) => (
            <Input
              key={`config-extra-${key}`}
              label={key}
              value={values?.[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              size="sm"
              helperText="未在模板中定义的配置项"
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
