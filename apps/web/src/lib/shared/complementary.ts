/**
 * 互补色生成器
 * 支持 HEX 颜色格式
 */

type Color = string;

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * 判断是否为 HEX 颜色格式
 */
function isHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * 将 3 位 HEX 扩展为 6 位
 */
function expandHex(hex: string): string {
  if (hex.length === 4) {
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex;
}

/**
 * HEX 转 RGB
 */
function hexToRgb(hex: string): RGB {
  hex = expandHex(hex);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * RGB 转 HEX
 */
function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * 生成互补色（通过 RGB 反转实现）
 * @param color 输入颜色（HEX 格式）
 * @returns HEX 格式的互补色
 *
 * @example
 * generateComplementary('#ff0000')
 * // 返回: "#00ffff" (青色)
 *
 * @example
 * generateComplementary('#3b82f6')
 * // 返回: "#c47d09" (橙色)
 */
export function generateComplementary(color: Color): string {
  if (!isHexColor(color)) {
    throw new Error(`Invalid HEX color format: ${color}`);
  }

  // 将 HEX 转换为 RGB
  const rgb = hexToRgb(color);

  // 计算互补色：每个通道用 255 减去原值
  const complementaryRgb: RGB = {
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b,
  };

  // 转换回 HEX
  return rgbToHex(complementaryRgb);
}

/**
 * 默认导出
 */
export default generateComplementary;
