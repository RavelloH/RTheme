/**
 * 格式化相对时间显示
 * @param date 目标日期
 * @returns 相对时间字符串，如：刚刚、52分钟前、一小时前、一天前等
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
): string {
  if (!date) {
    return "";
  }

  const targetDate = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - targetDate.getTime()) / 1000,
  );

  // 处理未来时间（理论上不应该出现，但做容错处理）
  if (diffInSeconds < 0) {
    return "刚刚";
  }

  // 小于1分钟 - 刚刚
  if (diffInSeconds < 60) {
    return "刚刚";
  }

  // 小于1小时 - X分钟前
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} 分钟前`;
  }

  // 小于24小时 - X小时前
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} 小时前`;
  }

  // 小于30天 - X天前
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} 天前`;
  }

  // 小于12个月 - X个月零X天前
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    const remainingDays = Math.floor((diffInSeconds % 2592000) / 86400);

    if (remainingDays === 0) {
      return `${months} 个月前`;
    }
    return `${months} 个月零 ${remainingDays} 天前`;
  }

  // 大于等于12个月 - X年零X个月前
  const years = Math.floor(diffInSeconds / 31536000);
  const remainingMonths = Math.floor((diffInSeconds % 31536000) / 2592000);

  if (remainingMonths === 0) {
    return `${years} 年前`;
  }
  return `${years} 年零 ${remainingMonths} 个月前`;
}

/**
 * 格式化为相对天数的简化版本（保留原有功能）
 * @param date 目标日期
 * @returns 相对天数，如：1天前、2天前等
 */
export function formatRelativeDays(
  date: Date | string | null | undefined,
): string {
  if (!date) {
    return "";
  }

  const targetDate = new Date(date);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays <= 0) {
    return "今天";
  }

  return `${diffInDays} 天前`;
}
