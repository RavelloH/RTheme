"use client";

import { memo } from "react";
import {
  RiCheckFill,
  RiCloseFill,
  RiFileDamageFill,
  RiLoader4Line,
  RiRestartLine,
} from "@remixicon/react";
import Image from "next/image";

import { CircularProgress } from "@/components/ui/CircularProgress";
import { calculateCompressionRatio, formatBytes } from "@/lib/shared/format";
import { AutoTransition } from "@/ui/AutoTransition";

type FileStatus = "pending" | "uploading" | "processing" | "success" | "error";

interface FileListItemProps {
  // 通用字段
  id: string;
  displayName: string;
  status: FileStatus;
  error?: string;

  // 预览图
  previewSrc?: string;
  imageLoadError?: boolean;
  onImageError?: () => void;

  // 文件大小信息
  originalSize?: number;
  processedSize?: number;
  isDuplicate?: boolean;

  // 额外信息（导入项的 URL、尺寸等）
  subtitle?: string;
  resultInfo?: React.ReactNode;

  // 上传进度（仅上传模式使用）
  uploadProgress?: number;

  // 文件名编辑
  editable: boolean;
  onNameChange?: (newName: string) => void;
  originalName?: string;

  // 操作
  onRemove?: () => void;
  onRetry?: () => void;
  removeDisabled?: boolean;
  operationDisabled?: boolean;
}

/**
 * 预览图组件 - 使用 memo 避免不必要的重渲染
 * 只有当 previewSrc 或 imageLoadError 变化时才重新渲染
 */
interface PreviewImageProps {
  previewSrc?: string;
  imageLoadError?: boolean;
  onImageError?: () => void;
  displayName: string;
}

const PreviewImage = memo(
  function PreviewImage({
    previewSrc,
    imageLoadError,
    onImageError,
    displayName,
  }: PreviewImageProps) {
    return (
      <div className="flex-shrink-0">
        <div className="w-14 h-14 overflow-hidden bg-muted flex items-center justify-center">
          {previewSrc && !imageLoadError ? (
            <Image
              unoptimized
              src={previewSrc}
              alt={displayName}
              className="w-full h-full object-cover"
              width={56}
              height={56}
              onError={onImageError}
            />
          ) : (
            <RiFileDamageFill className="text-muted-foreground" size="1.5em" />
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 只有当这些 props 变化时才重新渲染
    return (
      prevProps.previewSrc === nextProps.previewSrc &&
      prevProps.imageLoadError === nextProps.imageLoadError &&
      prevProps.displayName === nextProps.displayName
    );
  },
);

/**
 * 统一的文件/导入项列表行组件
 * 兼容上传和导入两种场景
 */
export const FileListItem = memo(function FileListItem({
  id: _id,
  displayName,
  status,
  error,
  previewSrc,
  imageLoadError,
  onImageError,
  originalSize,
  processedSize,
  isDuplicate,
  subtitle,
  resultInfo,
  uploadProgress,
  editable,
  onNameChange,
  originalName,
  onRemove,
  onRetry,
  removeDisabled,
  operationDisabled,
}: FileListItemProps) {
  // 处理文件名编辑
  const handleFileNameBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const newName = e.currentTarget.textContent?.trim() || "";
    if (newName && onNameChange) {
      onNameChange(newName);
    } else if (originalName) {
      // 如果为空，恢复原始文件名
      e.currentTarget.textContent = originalName;
    }
  };

  // 处理回车键
  const handleFileNameKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 px-5">
      {/* 预览图 - 独立 memo 组件，避免进度更新时重新渲染 */}
      <PreviewImage
        previewSrc={previewSrc}
        imageLoadError={imageLoadError}
        onImageError={onImageError}
        displayName={displayName}
      />

      {/* 文件信息 */}
      <div className="flex-1 min-w-0">
        {/* 文件名（可编辑） */}
        <div
          contentEditable={editable && !operationDisabled}
          suppressContentEditableWarning
          onBlur={handleFileNameBlur}
          onKeyDown={handleFileNameKeyDown}
          className={`text-sm font-medium truncate mb-1 outline-none ${
            editable && !operationDisabled ? "cursor-text focus:underline" : ""
          }`}
        >
          {displayName}
        </div>

        {/* 错误信息 */}
        {error ? (
          <div className="text-xs text-error mt-1">{error}</div>
        ) : (
          <>
            {/* 子标题（URL 等） */}
            {subtitle && (
              <div className="text-xs text-muted-foreground truncate">
                {subtitle}
              </div>
            )}

            {/* 文件大小信息 */}
            {originalSize !== undefined && !resultInfo && (
              <div className="text-xs text-muted-foreground">
                {formatBytes(originalSize)}
                {processedSize !== undefined && (
                  <>
                    {" → "}
                    {formatBytes(processedSize)}
                    <span
                      className={
                        processedSize < originalSize
                          ? "text-success ml-1"
                          : "text-warning ml-1"
                      }
                    >
                      {calculateCompressionRatio(originalSize, processedSize)}
                    </span>
                  </>
                )}
                {isDuplicate && (
                  <span className="text-warning">（重复项目）</span>
                )}
              </div>
            )}

            {/* 成功结果信息 */}
            {resultInfo}
          </>
        )}
      </div>

      {/* 状态指示器 */}
      <div className="flex-shrink-0 w-20">
        <AutoTransition type="scale">
          {status === "pending" && <div className="h-6 w-6" />}
          {status === "uploading" && (
            <div className="flex flex-col items-center gap-1">
              {uploadProgress !== undefined ? (
                <CircularProgress progress={uploadProgress} radius={8} />
              ) : (
                <RiLoader4Line
                  className="animate-spin text-primary"
                  size="1.5em"
                />
              )}
            </div>
          )}
          {status === "processing" && (
            <div className="flex flex-col items-center gap-1">
              <RiLoader4Line
                className="animate-spin text-primary"
                size="1.5em"
              />
            </div>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-1">
              <RiCheckFill className="text-success" size="1.75em" />
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-1">
              <RiCloseFill className="text-error" size="1.75em" />
            </div>
          )}
        </AutoTransition>
      </div>

      {/* 删除/重试按钮 */}
      {status === "error" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
          aria-label={`重试 ${displayName}`}
          title="重试"
          disabled={operationDisabled}
        >
          <RiRestartLine size="1.5em" />
        </button>
      ) : (
        onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 p-2 text-muted-foreground hover:text-error hover:bg-error/5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
            aria-label={`删除 ${displayName}`}
            title="删除此项目"
            disabled={
              removeDisabled ||
              operationDisabled ||
              status === "success" ||
              status === "uploading" ||
              status === "processing"
            }
          >
            <RiCloseFill size="1.5em" />
          </button>
        )
      )}
    </div>
  );
});
