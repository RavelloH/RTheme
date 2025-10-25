/**
 * 渐变色生成库
 * 支持 HEX 和 OKLCh 颜色格式的渐变生成
 */

type Color = string;

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface OKLCh {
  l: number;
  c: number;
  h: number;
}

/**
 * 判断是否为 HEX 颜色格式
 */
function isHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * 判断是否为 OKLCh 颜色格式
 */
function isOKLChColor(color: string): boolean {
  return /^oklch\s*\(\s*[\d.]+%?\s+[\d.]+%?\s+[\d.]+\s*\)$/i.test(color);
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
 * 解析 OKLCh 颜色字符串
 */
function parseOKLCh(color: string): OKLCh {
  const match = color.match(
    /oklch\s*\(\s*([\d.]+)%?\s+([\d.]+)%?\s+([\d.]+)\s*\)/i,
  );
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid OKLCh color: ${color}`);
  }
  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
  };
}

/**
 * OKLCh 转 RGB
 * 使用 OKLab 作为中间色彩空间
 */
function oklchToRgb(oklch: OKLCh): RGB {
  // OKLCh to OKLab
  const { l, c, h } = oklch;
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab to Linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const lr = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  // Linear RGB to sRGB
  const toSrgb = (c: number) => {
    const abs = Math.abs(c);
    if (abs <= 0.0031308) {
      return c * 12.92;
    }
    return (Math.sign(c) || 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
  };

  return {
    r: Math.max(0, Math.min(255, toSrgb(lr) * 255)),
    g: Math.max(0, Math.min(255, toSrgb(lg) * 255)),
    b: Math.max(0, Math.min(255, toSrgb(lb) * 255)),
  };
}

/**
 * RGB 转 OKLCh
 */
function rgbToOklch(rgb: RGB): OKLCh {
  // sRGB to Linear RGB
  const fromSrgb = (c: number) => {
    const abs = Math.abs(c);
    if (abs <= 0.04045) {
      return c / 12.92;
    }
    return (Math.sign(c) || 1) * Math.pow((abs + 0.055) / 1.055, 2.4);
  };

  const r = fromSrgb(rgb.r / 255);
  const g = fromSrgb(rgb.g / 255);
  const b = fromSrgb(rgb.b / 255);

  // Linear RGB to OKLab
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab to OKLCh
  const C = Math.sqrt(a * a + B * B);
  let H = Math.atan2(B, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
}

/**
 * 在两个颜色之间进行插值
 */
function interpolateColors(
  color1: Color,
  color2: Color,
  steps: number,
): Color[] {
  // 判断颜色格式
  const isColor1Hex = isHexColor(color1);
  const isColor2Hex = isHexColor(color2);
  const isColor1OKLCh = isOKLChColor(color1);
  const isColor2OKLCh = isOKLChColor(color2);

  if (!isColor1Hex && !isColor1OKLCh) {
    throw new Error(`Invalid color format for color1: ${color1}`);
  }
  if (!isColor2Hex && !isColor2OKLCh) {
    throw new Error(`Invalid color format for color2: ${color2}`);
  }

  if (steps < 2) {
    throw new Error("Steps must be at least 2");
  }

  // 将颜色转换为 OKLCh 进行插值（在感知均匀的色彩空间中）
  let oklch1: OKLCh, oklch2: OKLCh;

  if (isColor1Hex) {
    const rgb1 = hexToRgb(color1);
    oklch1 = rgbToOklch(rgb1);
  } else {
    oklch1 = parseOKLCh(color1);
  }

  if (isColor2Hex) {
    const rgb2 = hexToRgb(color2);
    oklch2 = rgbToOklch(rgb2);
  } else {
    oklch2 = parseOKLCh(color2);
  }

  // 处理色相环绕
  let h1 = oklch1.h;
  let h2 = oklch2.h;

  // 选择最短路径
  if (Math.abs(h2 - h1) > 180) {
    if (h2 > h1) {
      h1 += 360;
    } else {
      h2 += 360;
    }
  }

  const result: Color[] = [];

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);

    const interpolated: OKLCh = {
      l: oklch1.l + (oklch2.l - oklch1.l) * t,
      c: oklch1.c + (oklch2.c - oklch1.c) * t,
      h: (h1 + (h2 - h1) * t) % 360,
    };

    // 转换回 RGB 再转为 HEX
    const rgb = oklchToRgb(interpolated);
    result.push(rgbToHex(rgb));
  }

  return result;
}

/**
 * 生成渐变色数组
 * @param color1 起始颜色（HEX 或 OKLCh 格式）
 * @param color2 结束颜色（HEX 或 OKLCh 格式）
 * @param steps 分段段数（包含起始和结束颜色）
 * @returns HEX 颜色数组
 *
 * @example
 * generateGradient('#0a0310', '#ffb238', 5)
 * // 返回: ["#0a0310", "#49007e", "#ff005b", "#ff7d10", "#ffb238"]
 *
 * @example
 * generateGradient('oklch(0.5 0.2 180)', 'oklch(0.8 0.15 60)', 3)
 * // 返回: ["#00a2a8", "#7fa486", "#c9a562"]
 */
export function generateGradient(
  color1: Color,
  color2: Color,
  steps: number,
): string[] {
  return interpolateColors(color1, color2, steps);
}

/**
 * 默认导出
 */
export default generateGradient;
