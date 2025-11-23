"use client";

import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import Clickable from "@/ui/Clickable";
import { useToast } from "@/ui/Toast";
import type { MediaDetail, MediaListItem } from "@repo/shared-types/api/media";
import {
  RiImageLine,
  RiVideoLine,
  RiMusicLine,
  RiFileLine,
  RiServerLine,
  RiLoader4Line,
} from "@remixicon/react";
import { RiExternalLinkLine, RiFileCopyLine } from "@remixicon/react";
import CMSImage from "@/components/CMSImage";
import { AutoResizer } from "@/ui/AutoResizer";

interface MediaPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  media: MediaDetail | MediaListItem | null;
  loading?: boolean;
}

// 类型守卫：检查是否为 MediaDetail
function isMediaDetail(
  media: MediaDetail | MediaListItem,
): media is MediaDetail {
  return "hash" in media;
}

export default function MediaPreviewDialog({
  open,
  onClose,
  media,
  loading = false,
}: MediaPreviewDialogProps) {
  const toast = useToast();

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
      toast.success("链接已复制到剪贴板");
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("无法复制到剪贴板，请手动复制");
    }
  };

  // 构建预览URL
  const previewUrl = media ? `/p/${media.imageId}` : "";
  const previewFullUrl =
    typeof window !== "undefined" && media
      ? `${window.location.origin}/p/${media.imageId}`
      : media
        ? `/p/${media.imageId}`
        : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={media ? `媒体文件详情 - ${media.originalName}` : "媒体文件详情"}
      size="xl"
    >
      {media ? (
        <div className="px-6 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 预览区域 */}
          {media.mediaType === "IMAGE" && media.width && media.height && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                预览
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <div
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    width: Math.min(
                      media.width,
                      (400 * media.width) / media.height,
                    ),
                    aspectRatio: `${media.width} / ${media.height}`,
                    maxHeight: "400px",
                    maxWidth: "100%",
                  }}
                >
                  <CMSImage
                    src={previewUrl}
                    alt={media.altText || media.originalName}
                    fill
                    blur={media.blur}
                    optimized={false}
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  label="预览"
                  onClick={() => window.open(previewUrl, "_blank")}
                  variant="primary"
                  size="sm"
                  icon={<RiExternalLinkLine size="1em" />}
                  iconPosition="left"
                />
                <Button
                  label="复制链接"
                  onClick={() => copyToClipboard(previewUrl)}
                  variant="ghost"
                  size="sm"
                  icon={<RiFileCopyLine size="1em" />}
                  iconPosition="left"
                />
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
                <label className="text-sm text-muted-foreground">
                  显示名称
                </label>
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
                <label className="text-sm text-muted-foreground">
                  MIME 类型
                </label>
                <p className="text-sm font-mono">{media.mimeType}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  文件类型
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {getFileTypeIcon(media.mediaType)}
                  <span className="text-sm">
                    {getFileTypeName(media.mediaType)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  文件大小
                </label>
                <p className="text-sm">{formatFileSize(media.size)}</p>
              </div>
              {(media.mediaType === "IMAGE" || media.mediaType === "VIDEO") && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      宽度
                    </label>
                    <p className="text-sm">{media.width || "-"} px</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      高度
                    </label>
                    <p className="text-sm">{media.height || "-"} px</p>
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">
                  替代文本
                </label>
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
                <p className="text-sm">
                  {loading ? (
                    <span className="text-muted-foreground">加载中...</span>
                  ) : isMediaDetail(media) ? (
                    media.isOptimized ? (
                      "是"
                    ) : (
                      "否"
                    )
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  上传时间
                </label>
                <p className="text-sm">{formatDateTime(media.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">短哈希</label>
                <p className="text-sm font-mono">{media.shortHash}</p>
              </div>
            </div>
          </div>

          {/* 上传者信息 */}
          <AutoResizer>
            {media.user && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                  上传者信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      用户
                    </label>
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
            <div className="space-y-4 mt-5">
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
                    {loading ? (
                      <span className="text-sm text-muted-foreground">
                        加载中...
                      </span>
                    ) : isMediaDetail(media) ? (
                      <span className="text-sm">
                        {media.storageProvider?.displayName ||
                          media.storageProvider?.name ||
                          "未知"}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    访问链接
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-mono text-muted-foreground break-all flex-1">
                      {previewFullUrl}
                    </p>
                    <Clickable
                      onClick={() => copyToClipboard(previewFullUrl)}
                      className="p-2  text-secondary-foreground"
                    >
                      <RiFileCopyLine size="1em" />
                    </Clickable>
                  </div>
                </div>
                {/* OSS 地址（仅 MediaDetail 有） */}
                {isMediaDetail(media) && media.storageUrl && (
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground">
                      OSS 地址
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono text-muted-foreground break-all flex-1">
                        {media.storageUrl}
                      </p>
                      <Clickable
                        onClick={() => copyToClipboard(media.storageUrl)}
                        className="p-2 text-secondary-foreground"
                      >
                        <RiFileCopyLine size="1em" />
                      </Clickable>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 技术信息 */}
            <div className="space-y-4 mt-5">
              <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                技术信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    文件哈希
                  </label>
                  <div className="bg-muted/50 p-3 rounded">
                    {loading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RiLoader4Line size="1em" className="animate-spin" />
                        <span className="text-xs">加载中...</span>
                      </div>
                    ) : isMediaDetail(media) ? (
                      <p className="text-xs font-mono break-all">
                        {media.hash}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
                {media.blur && (
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-2 block">
                      模糊数据
                    </label>
                    <div className="bg-muted/50 p-3 rounded">
                      <p className="text-xs font-mono break-all">
                        {media.blur}
                      </p>
                    </div>
                  </div>
                )}
                {isMediaDetail(media) && media.exif && (
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
                {isMediaDetail(media) && media.thumbnails && (
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
          </AutoResizer>
        </div>
      ) : null}
    </Dialog>
  );
}
