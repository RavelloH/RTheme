"use client";

import React, { useState } from "react";
import { Check, Copy, AlertCircle, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConfigContext, type EnvConfig } from "./context";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";

export type ConfigFormOutputMode = "escaped" | "base64";

// 单个字段输入组件（用于表单内部）
function ConfigField({
  label,
  placeholder,
}: {
  label: keyof EnvConfig;
  placeholder?: string;
}) {
  const { config, setConfig, errors } = useConfigContext();
  const error = errors.find((e) => e.field === label);
  const value = config[label];

  const isTextarea = label === "JWT_PRIVATE_KEY" || label === "JWT_PUBLIC_KEY";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setConfig({ [label]: e.target.value });
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={label}
        className="text-sm font-medium text-fd-foreground flex items-center gap-2"
      >
        {label}
        {error && <AlertCircle className="size-4 text-red-500" />}
      </label>
      {isTextarea ? (
        <textarea
          id={label}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={8}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-lg border bg-fd-background",
            "focus:outline-none focus:ring-2 focus:ring-fd-primary",
            "font-mono",
            error && "border-red-500 focus:ring-red-500",
            !error && "border-fd-border",
          )}
        />
      ) : (
        <input
          type="text"
          id={label}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-lg border bg-fd-background",
            "focus:outline-none focus:ring-2 focus:ring-fd-primary",
            "font-mono",
            error && "border-red-500 focus:ring-red-500",
            !error && "border-fd-border",
          )}
        />
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="size-3" />
          {error.message}
        </p>
      )}
    </div>
  );
}

// 单个字段的便捷组件（内联使用）
export function InlineField({ label }: { label: keyof EnvConfig }) {
  const { config, setConfig, errors } = useConfigContext();
  const error = errors.find((e) => e.field === label);
  const value = config[label];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ [label]: e.target.value });
  };

  return (
    <div className="flex flex-col gap-2 my-4 border-t-1 py-4">
      <label
        htmlFor={`inline-${label}`}
        className="text-sm font-medium text-fd-foreground flex items-center gap-2"
      >
        将<code>{label}</code>
        填入下方的配置输入框中，最后即可自动为你生成环境变量
        {error && <AlertCircle className="size-4 text-red-500" />}
      </label>
      <input
        type="text"
        id={`inline-${label}`}
        value={value}
        onChange={handleChange}
        placeholder={`请输入 ${label}`}
        className={cn(
          "w-full px-3 py-2 text-sm rounded-lg border bg-fd-background",
          "focus:outline-none focus:ring-2 focus:ring-fd-primary",
          "font-mono",
          error && "border-red-500 focus:ring-red-500",
          !error && "border-fd-border",
        )}
      />
      此操作均在你的浏览器本地完成，无需担心安全泄露问题。
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="size-3" />
          {error.message}
        </p>
      )}
    </div>
  );
}

// 格式化生成的环境变量
function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function formatJwtKey(value: string, outputMode: ConfigFormOutputMode): string {
  if (outputMode === "base64") {
    return toBase64(value);
  }

  return value.replace(/\n/g, "\\n");
}

function formatEnvContent(
  config: EnvConfig,
  outputMode: ConfigFormOutputMode = "escaped",
): string {
  const lines: string[] = [];

  // Database
  lines.push("# Database");
  lines.push(`DATABASE_URL="${config.DATABASE_URL}"`);
  lines.push("");

  // Redis
  lines.push("# Redis");
  lines.push(`REDIS_URL=${config.REDIS_URL}`);
  lines.push("");

  // Main Secret
  lines.push("# Main Secret");
  lines.push(`MASTER_SECRET="${config.MASTER_SECRET}"`);
  lines.push("");

  // JWT
  lines.push("# JWT");
  lines.push(
    `JWT_PRIVATE_KEY="${formatJwtKey(config.JWT_PRIVATE_KEY, outputMode)}"`,
  );
  lines.push(
    `JWT_PUBLIC_KEY="${formatJwtKey(config.JWT_PUBLIC_KEY, outputMode)}"`,
  );
  lines.push("");

  // Language
  lines.push("# Language");
  lines.push(`LANG=${config.LANG}`);

  return lines.join("\n");
}

// 主体配置表单组件
export function MainConfigForm({
  output = "escaped",
}: {
  output?: ConfigFormOutputMode;
}) {
  const { config, errors, validateAll, generateMissing } = useConfigContext();
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    await generateMissing();
    const isValid = validateAll();
    if (isValid) {
      setGenerated(true);
    }
  };

  const handleCopy = () => {
    const envContent = formatEnvContent(config, output);
    navigator.clipboard.writeText(envContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const envContent = generated ? formatEnvContent(config, output) : "";
  const hasErrors = errors.length > 0;
  const isReady = config.DATABASE_URL && config.REDIS_URL;

  return (
    <div className="p-6 py-3 rounded-xl border border-fd-border bg-fd-card">
      <h3 className="text-lg font-semibold mb-4 text-fd-foreground">
        环境变量配置生成器
      </h3>

      <div className="space-y-4 mb-6">
        <div className="p-4 rounded-lg bg-fd-muted/50 border border-fd-border">
          <p className="text-sm text-fd-muted-foreground mb-2">
            状态:{" "}
            {isReady ? (
              <span className="text-green-500 font-medium">已准备就绪</span>
            ) : (
              <span className="text-yellow-500 font-medium">
                等待填写必需字段
              </span>
            )}
          </p>
          <p className="text-sm text-fd-muted-foreground">
            {config.DATABASE_URL ? "✓ DATABASE_URL" : "✗ DATABASE_URL"}
            <br />
            {config.REDIS_URL ? "✓ REDIS_URL" : "✗ REDIS_URL"}
          </p>
        </div>

        <ConfigField
          label="DATABASE_URL"
          placeholder="postgresql://用户名:密码@主机[:端口]/数据库名"
        />
        <ConfigField
          label="REDIS_URL"
          placeholder="redis://localhost:6379 或 rediss://你的redis服务器"
        />

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={!isReady}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isReady
                ? "bg-fd-primary text-fd-primary-foreground hover:opacity-90"
                : "bg-fd-muted text-fd-muted-foreground",
            )}
          >
            <RotateCw className="size-4" />
            生成配置
          </button>
        </div>
      </div>

      {generated && (
        <div className="space-y-4">
          <div className="border-t border-fd-border pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-fd-foreground">
                生成的环境变量
              </h4>
              <button
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  "bg-fd-accent text-fd-accent-foreground hover:bg-fd-accent/80",
                )}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "已复制" : "复制"}
              </button>
            </div>

            <CodeBlock className="p-4 rounded-lg bg-fd-muted border border-fd-border overflow-x-auto">
              <Pre className="text-sm font-mono text-fd-foreground whitespace-pre">
                {envContent}
              </Pre>
            </CodeBlock>
          </div>

          {hasErrors && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                请修正以下错误:
              </p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                {errors.map((error, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertCircle className="size-3 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{error.field}</strong>: {error.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasErrors && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <Check className="size-4" />
                配置生成成功！点击"复制"按钮将内容粘贴到你的 .env.local 文件中。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 主组件
export default function ConfigForm({
  label,
  output = "escaped",
}: {
  label?: keyof EnvConfig;
  output?: ConfigFormOutputMode;
}) {
  // 如果指定了 label，显示单个字段
  if (label) {
    return <InlineField label={label} />;
  }

  // 否则显示完整的配置表单
  return <MainConfigForm output={output} />;
}
