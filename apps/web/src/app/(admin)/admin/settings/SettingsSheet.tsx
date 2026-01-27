"use client";

import { GridItem } from "@/components/RowGrid";
import { useBroadcast } from "@/hooks/use-broadcast";
import { useState, useEffect, useCallback } from "react";
import type { SettingSelectMessage } from "./SettingsSelect";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiSaveLine, RiRefreshLine } from "@remixicon/react";
import { getSettings, updateSettings } from "@/actions/setting";
import runWithAuth from "@/lib/client/run-with-auth";
import { defaultConfigs } from "@/data/default-configs";

interface SettingConfig {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

export default function SettingSheet() {
  const [category, setCategory] = useState<string>("site"); // 默认选择站点信息
  const [settings, setSettings] = useState<SettingConfig[]>([]);
  const [filteredSettings, setFilteredSettings] = useState<SettingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
  const toast = useToast();

  // 监听分类选择广播
  useBroadcast<SettingSelectMessage>((message) => {
    if (message.type === "setting-select") {
      setCategory(message.category);
    }
  });

  // 获取所有配置项
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runWithAuth(
        getSettings,
        { access_token: undefined }, // 使用 cookie 中的 token
      );

      let dbSettings: { key: string; value: unknown; updatedAt: string }[] = [];

      // 检查是否为 Response 对象（不应该在客户端出现，但为了类型安全）
      if (result instanceof Response) {
        const json = await result.json();
        if (json.success && json.data) {
          dbSettings = json.data;
        } else {
          throw new Error(json.message || "获取配置失败");
        }
      } else {
        // 直接是 ApiResponse 对象
        if (result.success && result.data) {
          dbSettings = result.data;
        } else {
          throw new Error(result.message || "获取配置失败");
        }
      }

      // 创建数据库配置的映射
      const dbSettingsMap = new Map(dbSettings.map((s) => [s.key, s]));

      // 合并 defaultConfigs 和数据库数据
      const mergedSettings: SettingConfig[] = defaultConfigs.map((config) => {
        const dbSetting = dbSettingsMap.get(config.key);
        return {
          key: config.key,
          value: dbSetting ? dbSetting.value : config.value,
          description: config.description || null,
          updatedAt: dbSetting ? dbSetting.updatedAt : new Date().toISOString(),
        };
      });

      setSettings(mergedSettings);
    } catch (error) {
      console.error("获取配置失败:", error);
      toast.error(
        "获取配置失败",
        error instanceof Error ? error.message : "未知错误",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 初始加载配置
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 根据分类过滤配置项
  useEffect(() => {
    if (!category) {
      setFilteredSettings([]);
      return;
    }

    const prefix = `${category}.`;
    const filtered = settings.filter((setting) =>
      setting.key.startsWith(prefix),
    );
    setFilteredSettings(filtered);
  }, [category, settings]);

  // 处理值变更
  const handleValueChange = (key: string, value: string) => {
    setEditedValues((prev) => {
      const setting = settings.find((s) => s.key === key);
      if (!setting) {
        return { ...prev, [key]: value };
      }

      // 获取原始显示值（不考虑编辑状态）
      const originalValue = getOriginalDisplayValue(setting);

      // 如果新值与原始值相同，从 editedValues 中移除
      if (value === originalValue) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }

      // 否则添加或更新
      return { ...prev, [key]: value };
    });
  };

  // 处理 JSON 对象字段的值变更
  const handleJsonFieldChange = (
    settingKey: string,
    path: string[],
    value: string,
  ) => {
    setEditedValues((prev) => {
      const setting = settings.find((s) => s.key === settingKey);
      if (!setting) {
        return prev;
      }

      // 获取当前编辑的 JSON 对象（如果有）或原始对象
      let currentJson: Record<string, unknown>;
      if (settingKey in prev) {
        currentJson =
          typeof prev[settingKey] === "string"
            ? JSON.parse(prev[settingKey] as string)
            : (prev[settingKey] as Record<string, unknown>);
      } else {
        const defaultValue = extractDefaultValue(setting.value);
        currentJson =
          typeof defaultValue === "object" && defaultValue !== null
            ? JSON.parse(JSON.stringify(defaultValue))
            : {};
      }

      // 更新嵌套路径的值
      let current: Record<string, unknown> = currentJson;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!key) continue; // 跳过无效的键
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }
      const lastKey = path[path.length - 1];
      if (lastKey) {
        current[lastKey] = value;
      }

      // 检查是否与原始值相同
      const originalValue = extractDefaultValue(setting.value);
      if (JSON.stringify(currentJson) === JSON.stringify(originalValue)) {
        const { [settingKey]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [settingKey]: currentJson };
    });
  };

  // 保存配置
  const handleSave = async () => {
    if (Object.keys(editedValues).length === 0) {
      toast.warning("没有修改", "请先修改配置项");
      return;
    }

    setSaving(true);
    try {
      // 将编辑的值转换为 API 期望的格式
      const settingsToUpdate = Object.entries(editedValues).map(
        ([key, value]) => {
          const originalSetting = settings.find((s) => s.key === key);
          if (!originalSetting) {
            return { key, value: { default: value } };
          }

          const defaultValue = extractDefaultValue(originalSetting.value);

          // 根据原始值的类型解析新值
          let parsedValue: unknown;

          // 如果原始值是日期字符串，转换回 ISO 8601 格式
          if (isDateString(defaultValue)) {
            try {
              // datetime-local 格式转换为 ISO 8601
              const date = new Date(value as string);
              if (isNaN(date.getTime())) {
                toast.error("日期格式错误", `配置项 ${key} 的值不是有效的日期`);
                throw new Error(`Invalid date for ${key}`);
              }
              parsedValue = { default: date.toISOString() };
            } catch {
              toast.error("日期格式错误", `配置项 ${key} 的值不是有效的日期`);
              throw new Error(`Invalid date for ${key}`);
            }
          }
          // 如果原始值是数组，将换行分隔的字符串转换为数组
          else if (Array.isArray(defaultValue)) {
            parsedValue = {
              default: (value as string)
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0),
            };
          }
          // 如果原始值是对象
          else if (typeof defaultValue === "object" && defaultValue !== null) {
            // 如果编辑的值已经是对象（通过 handleJsonFieldChange 设置的），直接使用
            if (typeof value === "object" && value !== null) {
              parsedValue = { default: value };
            }
            // 否则尝试解析 JSON 字符串
            else {
              try {
                parsedValue = { default: JSON.parse(value as string) };
              } catch {
                toast.error(
                  "JSON 格式错误",
                  `配置项 ${key} 的值不是有效的 JSON`,
                );
                throw new Error(`Invalid JSON for ${key}`);
              }
            }
          }
          // 如果原始值是布尔值
          else if (typeof defaultValue === "boolean") {
            const strValue = String(value).toLowerCase();
            parsedValue = {
              default:
                strValue === "true" || strValue === "1" || strValue === "yes",
            };
          }
          // 如果原始值是数字
          else if (typeof defaultValue === "number") {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              toast.error("数字格式错误", `配置项 ${key} 的值必须是数字`);
              throw new Error(`Invalid number for ${key}`);
            }
            parsedValue = { default: numValue };
          }
          // 其他情况作为字符串
          else {
            parsedValue = { default: value };
          }

          return {
            key,
            value: parsedValue,
          };
        },
      );

      const result = await runWithAuth(updateSettings, {
        access_token: undefined, // 使用 cookie 中的 token
        settings: settingsToUpdate,
      });

      // 检查是否为 Response 对象
      if (result instanceof Response) {
        const json = await result.json();
        if (json.success) {
          toast.success("保存成功", `已更新 ${json.data.updated} 个配置项`);
          setEditedValues({});
          await fetchSettings();
        } else {
          throw new Error(json.message || "保存配置失败");
        }
      } else {
        // 直接是 ApiResponse 对象
        if (result.success && result.data) {
          toast.success("保存成功", `已更新 ${result.data.updated} 个配置项`);
          setEditedValues({});
          await fetchSettings();
        } else {
          throw new Error(result.message || "保存配置失败");
        }
      }
    } catch (error) {
      console.error("保存配置失败:", error);
      if (error instanceof Error && !error.message.startsWith("Invalid")) {
        toast.error("保存配置失败", error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // 刷新配置
  const handleRefresh = () => {
    setEditedValues({});
    fetchSettings();
  };

  // 判断是否为日期字符串
  const isDateString = (value: unknown): boolean => {
    if (typeof value !== "string") return false;

    // ISO 8601 格式检测
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!isoDateRegex.test(value)) return false;

    // 验证是否为有效日期
    const date = new Date(value);
    return !isNaN(date.getTime());
  };

  // 提取 default 字段的值
  const extractDefaultValue = (value: unknown): unknown => {
    if (
      typeof value === "object" &&
      value !== null &&
      "default" in value &&
      value.default !== undefined
    ) {
      return value.default;
    }
    return value;
  };

  // 获取原始显示值（不考虑编辑状态）
  const getOriginalDisplayValue = (setting: SettingConfig): string => {
    // 提取 default 字段
    const defaultValue = extractDefaultValue(setting.value);

    // 如果是日期字符串，转换为 datetime-local 格式
    if (isDateString(defaultValue)) {
      const date = new Date(defaultValue as string);
      // 转换为本地时间的 datetime-local 格式 (YYYY-MM-DDTHH:mm)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 如果是数组，每行显示一个元素
    if (Array.isArray(defaultValue)) {
      return defaultValue.join("\n");
    }

    // 如果是对象，格式化为 JSON
    if (typeof defaultValue === "object" && defaultValue !== null) {
      return JSON.stringify(defaultValue, null, 2);
    }

    // 其他类型直接转字符串
    return String(defaultValue);
  };

  // 获取默认配置值（从 defaultConfigs 中获取）
  const getDefaultValue = (key: string): string => {
    const config = defaultConfigs.find((c) => c.key === key);
    if (!config) return "";

    const defaultValue = extractDefaultValue(config.value);

    // 如果是日期字符串，转换为 datetime-local 格式
    if (isDateString(defaultValue)) {
      const date = new Date(defaultValue as string);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 如果是数组，每行显示一个元素
    if (Array.isArray(defaultValue)) {
      return defaultValue.join("\n");
    }

    // 如果是对象，格式化为 JSON
    if (typeof defaultValue === "object" && defaultValue !== null) {
      return JSON.stringify(defaultValue, null, 2);
    }

    // 其他类型直接转字符串
    return String(defaultValue);
  };

  // 获取显示值
  const getDisplayValue = (setting: SettingConfig): string => {
    // 如果有编辑值，直接返回
    if (setting.key in editedValues) {
      return String(editedValues[setting.key]);
    }

    // 否则返回原始值
    return getOriginalDisplayValue(setting);
  };

  // 获取 JSON 对象中指定路径的值
  const getJsonFieldValue = (settingKey: string, path: string[]): string => {
    // 首先检查 editedValues
    if (settingKey in editedValues) {
      const editedValue = editedValues[settingKey];
      let current: unknown =
        typeof editedValue === "string" ? JSON.parse(editedValue) : editedValue;
      for (const key of path) {
        if (
          current &&
          typeof current === "object" &&
          key in (current as Record<string, unknown>)
        ) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return "";
        }
      }
      return String(current);
    }

    // 否则从原始 setting 获取
    const setting = settings.find((s) => s.key === settingKey);
    if (!setting) return "";

    const defaultValue = extractDefaultValue(setting.value);
    let current: unknown = defaultValue;
    for (const key of path) {
      if (
        current &&
        typeof current === "object" &&
        key in (current as Record<string, unknown>)
      ) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return "";
      }
    }
    return String(current);
  };

  // 渲染 JSON 对象的字段（递归）
  const renderJsonFields = (
    settingKey: string,
    obj: Record<string, unknown>,
    path: string[] = [],
    level: number = 0,
  ): React.ReactElement[] => {
    const fields: React.ReactElement[] = [];
    const keys = Object.keys(obj);

    keys.forEach((key, index) => {
      const value = obj[key];
      const currentPath = [...path, key];
      const isLast = index === keys.length - 1;
      const isObject =
        typeof value === "object" && value !== null && !Array.isArray(value);

      if (isObject) {
        // 如果是对象，显示标签并递归渲染子字段（跨越两列）
        fields.push(
          <div
            key={`${currentPath.join(".")}-object`}
            className="relative col-span-2 mb-1"
          >
            <div
              className="flex items-center"
              style={{ paddingLeft: `${level * 1.5}rem` }}
            >
              {level > 0 && (
                <>
                  {/* 垂直线从上方延伸到节点 */}
                  <div
                    className="absolute w-px bg-border"
                    style={{
                      left: `${(level - 1) * 1.5 + 0.5}rem`,
                      top: "-0.5rem",
                      height: "calc(50% + 0.5rem)",
                    }}
                  ></div>
                  {/* 水平线 */}
                  <div
                    className="absolute h-px bg-border"
                    style={{
                      left: `${(level - 1) * 1.5 + 0.5}rem`,
                      top: "50%",
                      width: "1rem",
                    }}
                  ></div>
                  {/* 如果不是最后一个，垂直线继续向下延伸 */}
                  {!isLast && (
                    <div
                      className="absolute w-px bg-border"
                      style={{
                        left: `${(level - 1) * 1.5 + 0.5}rem`,
                        top: "50%",
                        bottom: "-0.5rem",
                      }}
                    ></div>
                  )}
                  <div className="w-4"></div>
                </>
              )}
              <div className="text-md font-medium text-foreground">{key}</div>
            </div>
          </div>,
        );
        fields.push(
          ...renderJsonFields(
            settingKey,
            value as Record<string, unknown>,
            currentPath,
            level + 1,
          ),
        );
      } else {
        // 如果是叶子节点，显示字段名和 Input（作为 grid 的两个子元素）
        // 判断字段类型
        const fieldType = typeof value === "number" ? "number" : "text";

        fields.push(
          <div
            key={`${currentPath.join(".")}-label`}
            className="relative flex items-end justify-end pb-2"
            style={{ paddingLeft: `${level * 1.5}rem` }}
          >
            {level > 0 && (
              <>
                {/* 垂直线从上方延伸到节点，并继续向下到下一个元素 */}
                <div
                  className="absolute w-px bg-muted-foreground"
                  style={{
                    left: `${(level - 1) * 1.5 + 0.5}rem`,
                    top: "0",
                    height: isLast
                      ? "calc(100% - 0.5rem - 0.6em)"
                      : "calc(100% + 0.5rem)",
                  }}
                ></div>
                {/* 水平线 */}
                <div
                  className="absolute h-px bg-muted-foreground"
                  style={{
                    left: `${(level - 1) * 1.5 + 0.5}rem`,
                    bottom: "calc(0.5rem + 0.6em)",
                    width: "1rem",
                  }}
                ></div>
                <div className="w-4 shrink-0"></div>
              </>
            )}
            <div className="text-md font-medium text-foreground text-right whitespace-nowrap">
              {key}
            </div>
          </div>,
        );
        fields.push(
          <div
            key={`${currentPath.join(".")}-input`}
            className="flex items-start"
          >
            <Input
              label="配置值"
              type={fieldType}
              value={getJsonFieldValue(settingKey, currentPath)}
              onChange={(e) =>
                handleJsonFieldChange(settingKey, currentPath, e.target.value)
              }
              size="sm"
            />
          </div>,
        );
      }
    });

    return fields;
  };
  const getInputConfig = (
    setting: SettingConfig,
  ): {
    type?: string;
    rows?: number;
    useSelect?: boolean;
    isJsonObject?: boolean;
  } => {
    const defaultValue = extractDefaultValue(setting.value);

    // 如果是布尔值，使用 Select 组件
    if (typeof defaultValue === "boolean") {
      return {
        useSelect: true,
        type: "text",
        rows: undefined,
        isJsonObject: false,
      };
    }

    // 如果是日期字符串，使用 datetime-local 类型
    if (isDateString(defaultValue)) {
      return {
        type: "datetime-local",
        rows: undefined,
        useSelect: false,
        isJsonObject: false,
      };
    }

    // 如果是数组，根据数组长度确定行数
    if (Array.isArray(defaultValue)) {
      return {
        type: "text",
        rows: Math.max(3, Math.min(defaultValue.length, 10)),
        useSelect: false,
        isJsonObject: false,
      };
    }

    // 如果是对象，使用展开的字段显示
    if (typeof defaultValue === "object" && defaultValue !== null) {
      return {
        type: "text",
        rows: undefined,
        useSelect: false,
        isJsonObject: true,
      };
    }

    // 如果是数字，使用 number 类型
    if (typeof defaultValue === "number") {
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

  const getCategoryTitle = () => {
    const editedCount = Object.keys(editedValues).length;

    // 如果有未保存的配置，显示数量
    if (editedCount > 0) {
      return `${editedCount} 个未保存的配置`;
    }

    const categories: Record<string, string> = {
      site: "站点信息",
      seo: "SEO配置",
      user: "用户策略",
      content: "内容策略",
      media: "媒体策略",
    };
    return category ? categories[category] || category : "配置设置";
  };

  return (
    <>
      <GridItem
        areas={[1]}
        width={15}
        height={0.1}
        className="flex items-center justify-between text-2xl px-10"
      >
        <AutoTransition>{getCategoryTitle()}</AutoTransition>
        <div className="flex gap-2 text-base">
          <Button
            label="刷新"
            variant="ghost"
            size="sm"
            icon={<RiRefreshLine size="1em" />}
            onClick={handleRefresh}
            loading={loading}
            disabled={saving}
          />
          <Button
            label="保存修改"
            variant="ghost"
            size="sm"
            icon={<RiSaveLine size="1em" />}
            onClick={handleSave}
            loading={saving}
            disabled={loading || Object.keys(editedValues).length === 0}
          />
        </div>
      </GridItem>
      <GridItem
        areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
        width={15 / 11}
        className="py-4 px-10 overflow-y-auto"
      >
        <AutoTransition type="fade" duration={0.3} className="h-full">
          {loading ? (
            <div
              key="loading"
              className="flex items-center justify-center h-full"
            >
              <LoadingIndicator size="md" />
            </div>
          ) : !category ? (
            <div
              key="no-category"
              className="flex items-center justify-center h-full text-muted-foreground"
            >
              请从左侧选择配置分类
            </div>
          ) : filteredSettings.length === 0 ? (
            <div
              key="empty"
              className="flex items-center justify-center h-full text-muted-foreground"
            >
              该分类下暂无配置项
            </div>
          ) : (
            <div key={category} className="grid grid-cols-1">
              {filteredSettings.map((setting) => {
                const inputConfig = getInputConfig(setting);
                return (
                  <div key={setting.key} className="space-y-2">
                    <div className="flex flex-col gap-1 mb-2">
                      <div className="text-lg font-medium text-foreground">
                        {setting.key}
                      </div>
                      {setting.description && (
                        <div className="text-sm text-muted-foreground">
                          {setting.description}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground mt-1">
                        默认值：{getDefaultValue(setting.key) || "无"}
                      </div>
                    </div>

                    {inputConfig.useSelect ? (
                      // 布尔值使用 Select 组件
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          配置值
                        </div>
                        <Select
                          value={getDisplayValue(setting)}
                          onChange={(value) =>
                            handleValueChange(setting.key, String(value))
                          }
                          options={[
                            { value: "true", label: "是 (true)" },
                            { value: "false", label: "否 (false)" },
                          ]}
                          size="sm"
                        />
                      </div>
                    ) : inputConfig.isJsonObject ? (
                      // JSON 对象使用展开的字段显示
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground mb-2">
                          配置值
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                          {renderJsonFields(
                            setting.key,
                            extractDefaultValue(setting.value) as Record<
                              string,
                              unknown
                            >,
                          )}
                        </div>
                      </div>
                    ) : (
                      // 其他类型使用 Input 组件
                      <Input
                        label="配置值"
                        type={inputConfig.type}
                        value={getDisplayValue(setting)}
                        onChange={(e) =>
                          handleValueChange(setting.key, e.target.value)
                        }
                        size="sm"
                        rows={inputConfig.rows}
                      />
                    )}

                    <div className="text-sm text-muted-foreground mb-6">
                      最后更新:{" "}
                      {new Date(setting.updatedAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AutoTransition>
      </GridItem>
    </>
  );
}
