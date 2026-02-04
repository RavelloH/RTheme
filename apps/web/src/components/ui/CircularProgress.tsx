/**
 * 圆形进度条组件
 */

interface CircularProgressProps {
  /** 进度值 0-100 */
  progress: number;
  /** 圆形半径，默认 10 */
  radius?: number;
  /** SVG 尺寸，默认 24 */
  size?: number;
  /** 线条宽度，默认 2 */
  strokeWidth?: number;
}

export function CircularProgress({
  progress,
  radius = 10,
  size = 24,
  strokeWidth = 2,
}: CircularProgressProps) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size / 16 + "em"}
      height={size / 16 + "em"}
      className="transform -rotate-90"
    >
      {/* 背景圆 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-border"
      />
      {/* 进度圆 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-primary transition-all duration-300"
        strokeLinecap="round"
      />
    </svg>
  );
}
