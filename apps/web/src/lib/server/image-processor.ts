import "server-only";

import crypto from "crypto";
import sharp from "sharp";

// ============================================================================
// 常量定义
// ============================================================================

const BASE62_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * 支持的图片格式
 */
export const SUPPORTED_IMAGE_FORMATS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/tiff",
] as const;

/**
 * 图片处理模式
 */
export type ProcessMode = "lossy" | "lossless" | "original";

/**
 * 图片处理结果
 */
export interface ProcessedImage {
  /** 处理后的图片 buffer */
  buffer: Buffer;
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** MIME 类型 */
  mimeType: string;
  /** 文件扩展名（不带点） */
  extension: string;
  /** 文件大小（字节） */
  size: number;
  /** SHA-256 hash */
  hash: string;
  /** 短哈希（前8位 base62） */
  shortHash: string;
  /** Blur placeholder（base64 webp） */
  blur: string;
  /** EXIF 信息（仅在 lossless/original 模式） */
  exif: Record<string, unknown>;
}

// ============================================================================
// 哈希计算
// ============================================================================

/**
 * 计算 SHA-256 哈希
 */
function calculateHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Buffer 转 Base62 字符串
 */
function bufferToBase62(buffer: Buffer): string {
  let num = BigInt("0x" + buffer.toString("hex"));
  if (num === 0n) return "0";

  let result = "";
  const base = BigInt(62);

  while (num > 0n) {
    const remainder = Number(num % base);
    result = BASE62_CHARS[remainder] + result;
    num = num / base;
  }

  return result;
}

/**
 * 生成短哈希（SHA-256 → base62 → 前8位）
 */
function generateShortHash(buffer: Buffer): string {
  const hash = calculateHash(buffer);
  const hashBuffer = Buffer.from(hash, "hex");
  const base62 = bufferToBase62(hashBuffer);
  return base62.slice(0, 8).padStart(8, "0");
}

// ============================================================================
// 图片处理
// ============================================================================

/**
 * 生成 blur placeholder
 * 短边固定 10px，长边按比例缩放，转换为 webp，base64 编码
 */
async function generateBlurPlaceholder(buffer: Buffer): Promise<string> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("无法获取图片尺寸");
  }

  // 计算缩放尺寸（短边 10px）
  const isPortrait = metadata.height > metadata.width;
  const targetWidth = isPortrait ? 10 : Math.round((10 * metadata.width) / metadata.height);
  const targetHeight = isPortrait ? Math.round((10 * metadata.height) / metadata.width) : 10;

  const blurBuffer = await image
    .resize(targetWidth, targetHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 20, effort: 0 })
    .toBuffer();

  return `data:image/webp;base64,${blurBuffer.toString("base64")}`;
}

/**
 * 提取 EXIF 信息
 */
async function extractExif(buffer: Buffer): Promise<Record<string, unknown>> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // 提取常用 EXIF 字段
    const exif: Record<string, unknown> = {};

    if (metadata.exif) {
      exif.raw = metadata.exif;
    }

    if (metadata.orientation) {
      exif.orientation = metadata.orientation;
    }

    if (metadata.density) {
      exif.density = metadata.density;
    }

    if (metadata.chromaSubsampling) {
      exif.chromaSubsampling = metadata.chromaSubsampling;
    }

    if (metadata.hasAlpha !== undefined) {
      exif.hasAlpha = metadata.hasAlpha;
    }

    if (metadata.space) {
      exif.colorSpace = metadata.space;
    }

    return exif;
  } catch (error) {
    console.error("提取 EXIF 失败:", error);
    return {};
  }
}

/**
 * 处理图片 - 有损压缩
 * 去除 EXIF → 转换为 AVIF（质量 50，effort 5，chromaSubsampling 4:4:4）
 */
async function processLossy(
  buffer: Buffer,
  originalFilename: string
): Promise<ProcessedImage> {
  const image = sharp(buffer);

  // 去除 EXIF
  const strippedBuffer = await image.rotate().toBuffer();

  // 获取尺寸
  const metadata = await sharp(strippedBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("无法获取图片尺寸");
  }

  // 转换为 AVIF
  const processedBuffer = await sharp(strippedBuffer)
    .avif({
      quality: 50,
      effort: 5,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();

  // 计算哈希（使用去除 EXIF 后的原图）
  const hash = calculateHash(strippedBuffer);
  const shortHash = generateShortHash(strippedBuffer);

  // 生成 blur
  const blur = await generateBlurPlaceholder(strippedBuffer);

  return {
    buffer: processedBuffer,
    width: metadata.width,
    height: metadata.height,
    mimeType: "image/avif",
    extension: "avif",
    size: processedBuffer.length,
    hash,
    shortHash,
    blur,
    exif: {},
  };
}

/**
 * 处理图片 - 无损转换
 * 保留 EXIF → 转换为无损 WebP
 */
async function processLossless(
  buffer: Buffer,
  originalFilename: string
): Promise<ProcessedImage> {
  const image = sharp(buffer);

  // 获取元数据和 EXIF
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("无法获取图片尺寸");
  }

  const exif = await extractExif(buffer);

  // 转换为无损 WebP（保留元数据）
  const processedBuffer = await image
    .webp({
      lossless: true,
      effort: 6,
    })
    .withMetadata() // 保留元数据
    .toBuffer();

  // 计算哈希（使用去除 EXIF 后的图）
  const strippedBuffer = await sharp(buffer).rotate().toBuffer();
  const hash = calculateHash(strippedBuffer);
  const shortHash = generateShortHash(strippedBuffer);

  // 生成 blur
  const blur = await generateBlurPlaceholder(buffer);

  return {
    buffer: processedBuffer,
    width: metadata.width,
    height: metadata.height,
    mimeType: "image/webp",
    extension: "webp",
    size: processedBuffer.length,
    hash,
    shortHash,
    blur,
    exif,
  };
}

/**
 * 处理图片 - 保留原片
 * 不做任何处理，仅提取元数据
 */
async function processOriginal(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<ProcessedImage> {
  const image = sharp(buffer);

  // 获取元数据和 EXIF
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("无法获取图片尺寸");
  }

  const exif = await extractExif(buffer);

  // 计算哈希（直接使用原图）
  const hash = calculateHash(buffer);
  const shortHash = generateShortHash(buffer);

  // 生成 blur
  const blur = await generateBlurPlaceholder(buffer);

  // 提取扩展名
  const extension = getExtensionFromMimeType(mimeType) || getExtensionFromFilename(originalFilename);

  return {
    buffer,
    width: metadata.width,
    height: metadata.height,
    mimeType,
    extension,
    size: buffer.length,
    hash,
    shortHash,
    blur,
    exif,
  };
}

/**
 * 从 MIME 类型获取扩展名
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/tiff": "tiff",
  };
  return map[mimeType.toLowerCase()] || "jpg";
}

/**
 * 从文件名获取扩展名
 */
function getExtensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }
  return "jpg";
}

// ============================================================================
// 主入口
// ============================================================================

/**
 * 处理图片
 *
 * @param buffer 原始图片 buffer
 * @param originalFilename 原始文件名
 * @param mimeType 原始 MIME 类型
 * @param mode 处理模式
 * @returns 处理后的图片信息
 */
export async function processImage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  mode: ProcessMode
): Promise<ProcessedImage> {
  // 验证文件类型
  if (!SUPPORTED_IMAGE_FORMATS.includes(mimeType as any)) {
    throw new Error(`不支持的图片格式: ${mimeType}`);
  }

  switch (mode) {
    case "lossy":
      return processLossy(buffer, originalFilename);
    case "lossless":
      return processLossless(buffer, originalFilename);
    case "original":
      return processOriginal(buffer, originalFilename, mimeType);
    default:
      throw new Error(`未知的处理模式: ${mode}`);
  }
}
