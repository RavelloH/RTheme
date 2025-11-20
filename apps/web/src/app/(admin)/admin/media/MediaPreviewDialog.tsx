"use client";

import { Dialog } from "@/ui/Dialog";
import type { MediaDetail } from "@repo/shared-types/api/media";
import {
  RiImageLine,
  RiVideoLine,
  RiMusicLine,
  RiFileLine,
  RiHardDriveLine,
  RiCalendarLine,
  RiUserLine,
  RiServerLine,
} from "@remixicon/react";
import { RiExternalLinkLine, RiFileCopyLine } from "@remixicon/react";

interface MediaPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  media: MediaDetail | null;
}

export default function MediaPreviewDialog({
  open,
  onClose,
  media,
}: MediaPreviewDialogProps) {
  if (!media) return null;

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 获取文件类型图标
  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return <RiImageLine size="1.2em" />;
      case "VIDEO":
        return <RiVideoLine size="1.2em" />;
      case "AUDIO":
        return <RiMusicLine size="1.2em" />;
      case "FILE":
        return <RiFileLine size="1.2em" />;
      default:
        return <RiFileLine size="1.2em" />;
    }
  };

  // 获取文件类型名称
  const getFileTypeName = (type: string) => {
    switch (type) {
      case "IMAGE":
        return "图片";
      case "VIDEO":
        return "视频";
      case "AUDIO":
        return "音频";
      case "FILE":
        return "文件";
      default:
        return "其他";
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 这里可以添加一个 toast 提示
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // 构建预览URL
  const previewUrl = `/p/${media.shortHash}`;
  const originalUrl = `${media.storageUrl}${media.fileName}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`媒体文件详情 - ${media.originalName}`}
      size="xl"
    >
      <div className="px-6 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
        {/* 预览区域 */}
        {media.mediaType === "IMAGE" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              预览
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
              <img
                src={previewUrl}
                alt={media.altText || media.originalName}
                className="max-w-full max-h-[400px] rounded-lg shadow-lg object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = originalUrl;
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(previewUrl, "_blank")}
                className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <RiExternalLinkLine size="1em" />
                打开预览链接
              </button>
              <button
                onClick={() => copyToClipboard(previewUrl)}
                className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                <RiFileCopyLine size="1em" />
                复制预览链接
              </button>
            </div>
          </div>
        )}

        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
            基本信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">文件 ID</label>
              <p className="text-sm font-mono">{media.id}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">显示名称</label>
              <p className="text-sm">{media.originalName}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                原始文件名
              </label>
              <p className="text-sm font-mono text-muted-foreground">
                {media.fileName}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">MIME 类型</label>
              <p className="text-sm font-mono">{media.mimeType}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">文件类型</label>
              <div className="flex items-center gap-2 mt-1">
                {getFileTypeIcon(media.mediaType)}
                <span className="text-sm">
                  {getFileTypeName(media.mediaType)}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">文件大小</label>
              <p className="text-sm">{formatFileSize(media.size)}</p>
            </div>
            {(media.mediaType === "IMAGE" || media.mediaType === "VIDEO") && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground">宽度</label>
                  <p className="text-sm">{media.width || "-"} px</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">高度</label>
                  <p className="text-sm">{media.height || "-"} px</p>
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">替代文本</label>
              <p className="text-sm">{media.altText || "-"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                在图库中显示
              </label>
              <p className="text-sm">{media.inGallery ? "是" : "否"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">已优化</label>
              <p className="text-sm">{media.isOptimized ? "是" : "否"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">上传时间</label>
              <p className="text-sm">{formatDateTime(media.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">短哈希</label>
              <p className="text-sm font-mono">{media.shortHash}</p>
            </div>
          </div>
        </div>

        {/* 上传者信息 */}
        {media.user && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              上传者信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">用户</label>
                <p className="text-sm">
                  {media.user.nickname || media.user.username}
                  <span className="text-muted-foreground ml-1">
                    (@{media.user.username}, UID: {media.user.uid})
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 存储信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
            存储信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">
                存储提供商
              </label>
              <div className="flex items-center gap-2 mt-1">
                <RiServerLine size="1em" />
                <span className="text-sm">
                  {media.storageProvider?.displayName ||
                    media.storageProvider?.name ||
                    "未知"}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">存储路径</label>
              <p className="text-sm font-mono text-muted-foreground">
                {media.storageUrl}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">原始链接</label>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-mono text-muted-foreground flex-1 break-all">
                  {originalUrl}
                </p>
                <button
                  onClick={() => copyToClipboard(originalUrl)}
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                >
                  <RiFileCopyLine size="1em" />
                  复制
                </button>
                <button
                  onClick={() => window.open(originalUrl, "_blank")}
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  <RiExternalLinkLine size="1em" />
                  打开
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 技术信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
            技术信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground mb-2 block">
                文件哈希
              </label>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs font-mono break-all">{media.hash}</p>
              </div>
            </div>
            {media.blur && (
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground mb-2 block">
                  模糊数据
                </label>
                <div className="bg-muted/50 p-3 rounded">
                  <p className="text-xs font-mono break-all">{media.blur}</p>
                </div>
              </div>
            )}
            {media.exif && (
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground mb-2 block">
                  EXIF 数据
                </label>
                <div className="bg-muted/50 p-3 rounded max-h-48 overflow-auto">
                  <pre className="text-xs">
                    {typeof media.exif === "string"
                      ? media.exif
                      : JSON.stringify(media.exif, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            {media.thumbnails && (
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground mb-2 block">
                  缩略图信息
                </label>
                <div className="bg-muted/50 p-3 rounded max-h-48 overflow-auto">
                  <pre className="text-xs">
                    {typeof media.thumbnails === "string"
                      ? media.thumbnails
                      : JSON.stringify(media.thumbnails, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
