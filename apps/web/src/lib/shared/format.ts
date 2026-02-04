/**
 * 共享格式化工具函数
 */

/**
 * 格式化字节大小为可读字符串
 * @param bytes 字节数
 * @returns 格式化后的字符串，如 "1.23 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 计算压缩率
 * @param original 原始大小
 * @param processed 处理后大小
 * @returns 压缩率字符串，如 "-30.5%" 或 "+10.2%"
 */
export function calculateCompressionRatio(
  original: number,
  processed: number,
): string {
  const ratio = ((original - processed) / original) * 100;
  return ratio > 0
    ? `-${ratio.toFixed(1)}%`
    : `+${Math.abs(ratio).toFixed(1)}%`;
}
