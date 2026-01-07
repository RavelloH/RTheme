"use client";

interface DateDividerProps {
  date: Date;
}

// 格式化日期显示
const formatDate = (date: Date) => {
  const now = new Date();
  const messageDate = new Date(date);

  // 重置时间到当天 00:00:00 以便比较日期
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDay = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate(),
  );

  // 今天
  if (msgDay.getTime() === today.getTime()) {
    return "今天";
  }

  // 昨天
  if (msgDay.getTime() === yesterday.getTime()) {
    return "昨天";
  }

  // 本年内（显示月日）
  if (messageDate.getFullYear() === now.getFullYear()) {
    return `${messageDate.getMonth() + 1}月${messageDate.getDate()}日`;
  }

  // 更早的日期（显示年月日）
  return `${messageDate.getFullYear()}年${messageDate.getMonth() + 1}月${messageDate.getDate()}日`;
};

export default function DateDivider({ date }: DateDividerProps) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="px-3 bg-muted/50 rounded-sm">
        <span className="text-xs text-muted-foreground">
          {formatDate(date)}
        </span>
      </div>
    </div>
  );
}
