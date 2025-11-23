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
  RiCameraLine,
} from "@remixicon/react";
import {
  RiExternalLinkLine,
  RiFileCopyLine,
  RiDownloadLine,
} from "@remixicon/react";
import CMSImage from "@/components/CMSImage";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { useState, useEffect } from "react";
import exifReader from "exif-reader";

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

// EXIF 解析后的数据类型
interface ParsedExifData {
  // 相机信息
  make?: string; // 制造商
  model?: string; // 型号
  software?: string; // 软件
  hostComputer?: string; // 设备型号
  // 拍摄参数
  exposureTime?: number; // 曝光时间
  fNumber?: number; // 光圈
  iso?: number; // ISO
  focalLength?: number; // 焦距
  focalLengthIn35mm?: number; // 等效35mm焦距
  exposureBiasValue?: number; // 曝光补偿
  brightnessValue?: number; // 亮度值
  lensModel?: string; // 镜头型号
  lensMake?: string; // 镜头制造商
  lensSpecification?: number[]; // 镜头规格
  // 拍摄模式
  exposureProgram?: number; // 曝光程序
  exposureMode?: number; // 曝光模式
  meteringMode?: number; // 测光模式
  sceneCaptureType?: number; // 场景类型
  whiteBalance?: number; // 白平衡
  flash?: number; // 闪光灯
  // 图片信息
  colorSpace?: number; // 色彩空间
  sensingMethod?: number; // 传感器类型
  pixelXDimension?: number; // 原始宽度
  pixelYDimension?: number; // 原始高度
  xResolution?: number; // X分辨率
  yResolution?: number; // Y分辨率
  resolutionUnit?: number; // 分辨率单位
  // 日期时间
  dateTime?: Date; // 拍摄时间
  dateTimeOriginal?: Date; // 原始拍摄时间
  offsetTime?: string; // 时区
  subSecTime?: string; // 毫秒
  // GPS 信息
  latitude?: number; // 纬度
  longitude?: number; // 经度
  altitude?: number; // 海拔
  gpsImgDirection?: number; // 拍摄方向
  gpsSpeed?: number; // 移动速度
  gpsSpeedRef?: string; // 速度单位
  gpsHPositioningError?: number; // 定位精度
  gpsDateTime?: string; // GPS时间
  // 其他
  orientation?: number; // 方向
  subjectArea?: number[]; // 对焦区域
}

export default function MediaPreviewDialog({
  open,
  onClose,
  media,
  loading = false,
}: MediaPreviewDialogProps) {
  const toast = useToast();
  const [parsedExif, setParsedExif] = useState<ParsedExifData | null>(null);
  const [exifLoading, setExifLoading] = useState(false);

  // 分组加载状态
  const [loadedGroups, setLoadedGroups] = useState<Set<string>>(new Set());

  // 解析 EXIF raw 数据
  useEffect(() => {
    const parseExifData = async () => {
      if (!media || !isMediaDetail(media)) {
        setParsedExif(null);
        setLoadedGroups(new Set());
        return;
      }

      // 如果没有 EXIF 数据或不是图片，跳过
      if (!media.exif || media.mediaType !== "IMAGE") {
        setParsedExif(null);
        setLoadedGroups(new Set());
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exifData = media.exif as any;

      console.log("EXIF 原始数据:", exifData);

      // 如果有 raw 数据，尝试解析
      if (exifData.raw) {
        try {
          setExifLoading(true);
          setLoadedGroups(new Set()); // 重置加载状态

          // raw 数据可能是 Buffer 对象被序列化后的格式
          let buffer: Buffer;

          console.log("EXIF raw 数据类型:", typeof exifData.raw);

          if (
            exifData.raw.type === "Buffer" &&
            Array.isArray(exifData.raw.data)
          ) {
            // 从序列化的 Buffer 对象重建
            console.log(
              "使用 Buffer.from 解析，数据长度:",
              exifData.raw.data.length,
            );
            buffer = Buffer.from(exifData.raw.data);
          } else if (typeof exifData.raw === "string") {
            // 如果是 base64 字符串
            console.log("使用 base64 解析");
            buffer = Buffer.from(exifData.raw, "base64");
          } else if (
            exifData.raw instanceof ArrayBuffer ||
            exifData.raw instanceof Uint8Array
          ) {
            console.log("使用 ArrayBuffer 解析");
            buffer = Buffer.from(exifData.raw);
          } else {
            console.warn("无法识别的 EXIF raw 格式", exifData.raw);
            setExifLoading(false);
            return;
          }

          console.log("Buffer 长度:", buffer.length);

          // 使用 exif-reader 解析原始 EXIF buffer
          const parsed = exifReader(buffer);

          console.log("解析后的 EXIF 数据:", parsed);

          if (parsed) {
            // exif-reader 返回的数据结构
            const photo = parsed.Photo || {}; // 拍摄参数
            const image = parsed.Image || {}; // 图片信息
            const gpsInfo = parsed.GPSInfo || {}; // GPS 信息

            // GPS 坐标转换（从 [度, 分, 秒] 转为十进制）
            const convertGPSCoordinate = (
              coords: number[],
            ): number | undefined => {
              if (!coords || coords.length !== 3) return undefined;
              const [degrees = 0, minutes = 0, seconds = 0] = coords;
              return degrees + minutes / 60 + seconds / 3600;
            };

            let latitude: number | undefined;
            let longitude: number | undefined;

            if (gpsInfo.GPSLatitude && gpsInfo.GPSLongitude) {
              latitude = convertGPSCoordinate(gpsInfo.GPSLatitude);
              longitude = convertGPSCoordinate(gpsInfo.GPSLongitude);

              // 处理南纬和西经
              if (gpsInfo.GPSLatitudeRef === "S" && latitude) {
                latitude = -latitude;
              }
              if (gpsInfo.GPSLongitudeRef === "W" && longitude) {
                longitude = -longitude;
              }
            }

            const exifData = {
              // 从 Image 获取相机信息
              make: image.Make,
              model: image.Model,
              software: image.Software,
              hostComputer: image.HostComputer,
              // 从 Photo 获取拍摄参数
              exposureTime: photo.ExposureTime,
              fNumber: photo.FNumber,
              iso: photo.ISOSpeedRatings,
              focalLength: photo.FocalLength,
              focalLengthIn35mm: photo.FocalLengthIn35mmFilm,
              exposureBiasValue: photo.ExposureBiasValue,
              brightnessValue: photo.BrightnessValue,
              lensModel: photo.LensModel,
              lensMake: photo.LensMake,
              lensSpecification: photo.LensSpecification,
              // 拍摄模式
              exposureProgram: photo.ExposureProgram,
              exposureMode: photo.ExposureMode,
              meteringMode: photo.MeteringMode,
              sceneCaptureType: photo.SceneCaptureType,
              whiteBalance: photo.WhiteBalance,
              flash: photo.Flash,
              // 图片信息
              colorSpace: photo.ColorSpace,
              sensingMethod: photo.SensingMethod,
              pixelXDimension: photo.PixelXDimension,
              pixelYDimension: photo.PixelYDimension,
              xResolution: image.XResolution,
              yResolution: image.YResolution,
              resolutionUnit: image.ResolutionUnit,
              // 日期时间
              dateTime: image.DateTime,
              dateTimeOriginal: photo.DateTimeOriginal,
              offsetTime: photo.OffsetTime,
              subSecTime: photo.SubSecTimeOriginal,
              // GPS 信息
              latitude,
              longitude,
              altitude: gpsInfo.GPSAltitude,
              gpsImgDirection: gpsInfo.GPSImgDirection,
              gpsSpeed: gpsInfo.GPSSpeed,
              gpsSpeedRef: gpsInfo.GPSSpeedRef,
              gpsHPositioningError: gpsInfo.GPSHPositioningError,
              gpsDateTime: gpsInfo.GPSDateStamp
                ? `${gpsInfo.GPSDateStamp} ${gpsInfo.GPSTimeStamp?.join(":")}`
                : undefined,
              // 其他
              orientation: image.Orientation,
              subjectArea: photo.SubjectArea,
            };

            setParsedExif(exifData);

            // 异步分组加载：先加载基本信息，再逐步加载其他组
            setExifLoading(false);

            // 延迟加载各个组，避免一次性渲染太多内容
            setTimeout(
              () => setLoadedGroups((prev) => new Set([...prev, "basic"])),
              50,
            );
            setTimeout(
              () => setLoadedGroups((prev) => new Set([...prev, "shooting"])),
              150,
            );
            setTimeout(
              () => setLoadedGroups((prev) => new Set([...prev, "lens"])),
              250,
            );
            setTimeout(
              () => setLoadedGroups((prev) => new Set([...prev, "gps"])),
              350,
            );
            setTimeout(
              () => setLoadedGroups((prev) => new Set([...prev, "technical"])),
              450,
            );
          }
        } catch (error) {
          console.error("解析 EXIF 数据失败:", error);
          setExifLoading(false);
        }
      } else {
        console.log("没有找到 raw 数据");
        setExifLoading(false);
      }
    };

    parseExifData();
  }, [media]);

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

  // 格式化曝光时间
  const formatExposureTime = (time: number) => {
    if (time >= 1) {
      return `${time}s`;
    }
    const denominator = Math.round(1 / time);
    return `1/${denominator}s`;
  };

  // 格式化光圈
  const formatAperture = (fNumber: number) => {
    return `f/${fNumber.toFixed(1)}`;
  };

  // 格式化焦距
  const formatFocalLength = (length: number) => {
    return `${length}mm`;
  };

  // 格式化 GPS 坐标
  const formatGPS = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lon).toFixed(6)}°${lonDir}`;
  };

  // 格式化测光模式
  const formatMeteringMode = (mode: number) => {
    const modes: Record<number, string> = {
      0: "未知",
      1: "平均测光",
      2: "中央重点平均测光",
      3: "点测光",
      4: "多点测光",
      5: "评价测光",
      6: "局部测光",
      255: "其他",
    };
    return modes[mode] || `未知 (${mode})`;
  };

  // 格式化曝光程序
  const formatExposureProgram = (program: number) => {
    const programs: Record<number, string> = {
      0: "未定义",
      1: "手动",
      2: "程序自动",
      3: "光圈优先",
      4: "快门优先",
      5: "创意程序",
      6: "动作程序",
      7: "人像模式",
      8: "风景模式",
    };
    return programs[program] || `未知 (${program})`;
  };

  // 格式化曝光模式
  const formatExposureMode = (mode: number) => {
    const modes: Record<number, string> = {
      0: "自动曝光",
      1: "手动曝光",
      2: "自动包围曝光",
    };
    return modes[mode] || `未知 (${mode})`;
  };

  // 格式化白平衡
  const formatWhiteBalance = (wb: number) => {
    const modes: Record<number, string> = {
      0: "自动白平衡",
      1: "手动白平衡",
    };
    return modes[wb] || `未知 (${wb})`;
  };

  // 格式化场景类型
  const formatSceneCaptureType = (type: number) => {
    const types: Record<number, string> = {
      0: "标准",
      1: "风景",
      2: "人像",
      3: "夜景",
    };
    return types[type] || `未知 (${type})`;
  };

  // 格式化闪光灯状态
  const formatFlash = (flash: number) => {
    const parts: string[] = [];

    // 位 0: 闪光灯是否闪光
    if (flash & 0x01) {
      parts.push("已闪光");
    } else {
      parts.push("未闪光");
    }

    // 位 1-2: 闪光灯返回
    const returnBits = (flash >> 1) & 0x03;
    if (returnBits === 2) parts.push("检测到返回光");
    if (returnBits === 3) parts.push("未检测到返回光");

    // 位 3-4: 闪光灯模式
    const modeBits = (flash >> 3) & 0x03;
    if (modeBits === 1) parts.push("强制闪光");
    if (modeBits === 2) parts.push("强制关闭");
    if (modeBits === 3) parts.push("自动模式");

    // 位 6: 红眼消除
    if (flash & 0x40) parts.push("红眼消除");

    return parts.join(", ");
  };

  // 格式化色彩空间
  const formatColorSpace = (space: number) => {
    const spaces: Record<number, string> = {
      1: "sRGB",
      2: "Adobe RGB",
      65535: "未校准",
    };
    return spaces[space] || `未知 (${space})`;
  };

  // 格式化传感器类型
  const formatSensingMethod = (method: number) => {
    const methods: Record<number, string> = {
      1: "未定义",
      2: "单芯片彩色区域传感器",
      3: "双芯片彩色区域传感器",
      4: "三芯片彩色区域传感器",
      5: "彩色顺序区域传感器",
      7: "三线性传感器",
      8: "彩色顺序线性传感器",
    };
    return methods[method] || `未知 (${method})`;
  };

  // 格式化曝光补偿
  const formatExposureBias = (bias: number) => {
    const sign = bias >= 0 ? "+" : "";
    return `${sign}${bias.toFixed(1)} EV`;
  };

  // 格式化镜头规格
  const formatLensSpec = (spec: number[]) => {
    if (!spec || spec.length < 4) return "";
    const [minFocal = 0, maxFocal = 0, minAperture = 0, maxAperture = 0] = spec;
    if (minFocal === maxFocal) {
      return `${minFocal.toFixed(1)}mm f/${minAperture.toFixed(1)}`;
    }
    return `${minFocal.toFixed(1)}-${maxFocal.toFixed(1)}mm f/${minAperture.toFixed(1)}-${maxAperture.toFixed(1)}`;
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

  // 下载文件
  const downloadFile = async () => {
    if (!media) return;

    try {
      // 使用预览 URL 下载文件
      const response = await fetch(previewUrl);
      const blob = await response.blob();

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = media.originalName; // 使用原始文件名
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("文件下载成功");
    } catch (err) {
      console.error("Failed to download file: ", err);
      toast.error("文件下载失败，请稍后重试");
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
                  label="下载文件"
                  onClick={downloadFile}
                  variant="ghost"
                  size="sm"
                  icon={<RiDownloadLine size="1em" />}
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

            {/* 拍摄信息（EXIF） */}
            {parsedExif && (
              <AutoResizer>
                <div className="space-y-4 mt-5">
                  <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2 flex items-center gap-2">
                    <RiCameraLine size="1.2em" />
                    拍摄信息
                  </h3>

                  {/* 基本信息组 */}
                  <AutoTransition type="slideUp" duration={0.3}>
                    {loadedGroups.has("basic") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 相机品牌 */}
                        {parsedExif.make && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              相机品牌
                            </label>
                            <p className="text-sm">{parsedExif.make}</p>
                          </div>
                        )}

                        {/* 相机型号 */}
                        {parsedExif.model && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              相机型号
                            </label>
                            <p className="text-sm">{parsedExif.model}</p>
                          </div>
                        )}

                        {/* 系统版本 */}
                        {parsedExif.software && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              系统版本
                            </label>
                            <p className="text-sm">{parsedExif.software}</p>
                          </div>
                        )}

                        {/* 设备型号 */}
                        {parsedExif.hostComputer && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              设备型号
                            </label>
                            <p className="text-sm">{parsedExif.hostComputer}</p>
                          </div>
                        )}

                        {/* 拍摄时间 */}
                        {parsedExif.dateTimeOriginal && (
                          <div className="md:col-span-2">
                            <label className="text-sm text-muted-foreground">
                              拍摄时间
                            </label>
                            <p className="text-sm">
                              {formatDateTime(
                                parsedExif.dateTimeOriginal.toISOString(),
                              )}
                              {parsedExif.offsetTime && (
                                <span className="text-muted-foreground ml-1">
                                  ({parsedExif.offsetTime})
                                </span>
                              )}
                              {parsedExif.subSecTime && (
                                <span className="text-muted-foreground ml-1">
                                  .{parsedExif.subSecTime}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </AutoTransition>

                  {/* 拍摄参数组 */}
                  <AutoTransition type="slideUp" duration={0.3}>
                    {loadedGroups.has("shooting") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                        {/* 快门速度 */}
                        {parsedExif.exposureTime && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              快门速度
                            </label>
                            <p className="text-sm font-mono">
                              {formatExposureTime(parsedExif.exposureTime)}
                            </p>
                          </div>
                        )}

                        {/* 光圈 */}
                        {parsedExif.fNumber && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              光圈
                            </label>
                            <p className="text-sm font-mono">
                              {formatAperture(parsedExif.fNumber)}
                            </p>
                          </div>
                        )}

                        {/* ISO */}
                        {parsedExif.iso && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              ISO 感光度
                            </label>
                            <p className="text-sm font-mono">
                              {parsedExif.iso}
                            </p>
                          </div>
                        )}

                        {/* 曝光补偿 */}
                        {parsedExif.exposureBiasValue !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              曝光补偿
                            </label>
                            <p className="text-sm font-mono">
                              {formatExposureBias(parsedExif.exposureBiasValue)}
                            </p>
                          </div>
                        )}

                        {/* 焦距 */}
                        {parsedExif.focalLength && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              焦距
                            </label>
                            <p className="text-sm font-mono">
                              {formatFocalLength(parsedExif.focalLength)}
                            </p>
                          </div>
                        )}

                        {/* 等效35mm焦距 */}
                        {parsedExif.focalLengthIn35mm && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              等效焦距 (35mm)
                            </label>
                            <p className="text-sm font-mono">
                              {parsedExif.focalLengthIn35mm}mm
                            </p>
                          </div>
                        )}

                        {/* 测光模式 */}
                        {parsedExif.meteringMode !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              测光模式
                            </label>
                            <p className="text-sm">
                              {formatMeteringMode(parsedExif.meteringMode)}
                            </p>
                          </div>
                        )}

                        {/* 曝光程序 */}
                        {parsedExif.exposureProgram !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              曝光程序
                            </label>
                            <p className="text-sm">
                              {formatExposureProgram(
                                parsedExif.exposureProgram,
                              )}
                            </p>
                          </div>
                        )}

                        {/* 曝光模式 */}
                        {parsedExif.exposureMode !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              曝光模式
                            </label>
                            <p className="text-sm">
                              {formatExposureMode(parsedExif.exposureMode)}
                            </p>
                          </div>
                        )}

                        {/* 白平衡 */}
                        {parsedExif.whiteBalance !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              白平衡
                            </label>
                            <p className="text-sm">
                              {formatWhiteBalance(parsedExif.whiteBalance)}
                            </p>
                          </div>
                        )}

                        {/* 场景类型 */}
                        {parsedExif.sceneCaptureType !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              场景类型
                            </label>
                            <p className="text-sm">
                              {formatSceneCaptureType(
                                parsedExif.sceneCaptureType,
                              )}
                            </p>
                          </div>
                        )}

                        {/* 闪光灯 */}
                        {parsedExif.flash !== undefined && (
                          <div className="md:col-span-2">
                            <label className="text-sm text-muted-foreground">
                              闪光灯
                            </label>
                            <p className="text-sm">
                              {formatFlash(parsedExif.flash)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </AutoTransition>

                  {/* 镜头信息组 */}
                  <AutoTransition type="slideUp" duration={0.3}>
                    {loadedGroups.has("lens") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                        {/* 镜头型号 */}
                        {parsedExif.lensModel && (
                          <div className="md:col-span-2">
                            <label className="text-sm text-muted-foreground">
                              镜头型号
                            </label>
                            <p className="text-sm">{parsedExif.lensModel}</p>
                          </div>
                        )}

                        {/* 镜头制造商 */}
                        {parsedExif.lensMake && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              镜头制造商
                            </label>
                            <p className="text-sm">{parsedExif.lensMake}</p>
                          </div>
                        )}

                        {/* 镜头规格 */}
                        {parsedExif.lensSpecification && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              镜头规格
                            </label>
                            <p className="text-sm font-mono">
                              {formatLensSpec(parsedExif.lensSpecification)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </AutoTransition>

                  {/* GPS 信息组 */}
                  <AutoTransition type="slideUp" duration={0.3}>
                    {loadedGroups.has("gps") &&
                      (parsedExif.latitude || parsedExif.longitude) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                          {/* GPS 位置 */}
                          {parsedExif.latitude && parsedExif.longitude && (
                            <div className="md:col-span-2">
                              <label className="text-sm text-muted-foreground">
                                拍摄地点
                              </label>
                              <p className="text-sm font-mono">
                                {formatGPS(
                                  parsedExif.latitude,
                                  parsedExif.longitude,
                                )}
                                {parsedExif.altitude && (
                                  <span className="text-muted-foreground ml-2">
                                    (海拔: {parsedExif.altitude.toFixed(1)}m)
                                  </span>
                                )}
                              </p>
                            </div>
                          )}

                          {/* GPS 拍摄方向 */}
                          {parsedExif.gpsImgDirection !== undefined && (
                            <div>
                              <label className="text-sm text-muted-foreground">
                                拍摄方向
                              </label>
                              <p className="text-sm font-mono">
                                {parsedExif.gpsImgDirection.toFixed(1)}°
                                (罗盘方位)
                              </p>
                            </div>
                          )}

                          {/* GPS 定位精度 */}
                          {parsedExif.gpsHPositioningError !== undefined && (
                            <div>
                              <label className="text-sm text-muted-foreground">
                                定位精度
                              </label>
                              <p className="text-sm font-mono">
                                ±{parsedExif.gpsHPositioningError.toFixed(1)}m
                              </p>
                            </div>
                          )}

                          {/* GPS 移动速度 */}
                          {parsedExif.gpsSpeed !== undefined && (
                            <div>
                              <label className="text-sm text-muted-foreground">
                                移动速度
                              </label>
                              <p className="text-sm font-mono">
                                {parsedExif.gpsSpeed.toFixed(1)}{" "}
                                {parsedExif.gpsSpeedRef === "K"
                                  ? "km/h"
                                  : "mph"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                  </AutoTransition>

                  {/* 技术信息组 */}
                  <AutoTransition type="slideUp" duration={0.3}>
                    {loadedGroups.has("technical") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                        {/* 色彩空间 */}
                        {parsedExif.colorSpace !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              色彩空间
                            </label>
                            <p className="text-sm">
                              {formatColorSpace(parsedExif.colorSpace)}
                            </p>
                          </div>
                        )}

                        {/* 传感器类型 */}
                        {parsedExif.sensingMethod !== undefined && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              传感器类型
                            </label>
                            <p className="text-sm">
                              {formatSensingMethod(parsedExif.sensingMethod)}
                            </p>
                          </div>
                        )}

                        {/* 原始像素尺寸 */}
                        {parsedExif.pixelXDimension &&
                          parsedExif.pixelYDimension && (
                            <div>
                              <label className="text-sm text-muted-foreground">
                                原始像素尺寸
                              </label>
                              <p className="text-sm font-mono">
                                {parsedExif.pixelXDimension} ×{" "}
                                {parsedExif.pixelYDimension}
                              </p>
                            </div>
                          )}

                        {/* 图片分辨率 */}
                        {parsedExif.xResolution && parsedExif.yResolution && (
                          <div>
                            <label className="text-sm text-muted-foreground">
                              图片分辨率
                            </label>
                            <p className="text-sm font-mono">
                              {parsedExif.xResolution} ×{" "}
                              {parsedExif.yResolution}{" "}
                              {parsedExif.resolutionUnit === 2 ? "dpi" : "dpcm"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </AutoTransition>
                </div>
              </AutoResizer>
            )}

            {exifLoading && (
              <div className="space-y-4 mt-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RiLoader4Line size="1em" className="animate-spin" />
                  <span className="text-sm">正在解析拍摄信息...</span>
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
