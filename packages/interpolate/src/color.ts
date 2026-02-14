import type {RGB} from 'rendx-core';

const HEX_REGEX = /^#([A-Fa-f0-9]{6})$/;
const RGB_REGEX = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

const parseColor = (color: string): RGB => {
  let match: RegExpExecArray | null;
  if ((match = HEX_REGEX.exec(color))) {
    const v = parseInt(match[1], 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  }
  if ((match = RGB_REGEX.exec(color))) {
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  throw new Error(`Unsupported color format: ${color}`);
};

// 预构建 0-255 hex 查找表，避免运行时 toString(16) + padStart
const HEX_TABLE: string[] = new Array(256);
for (let i = 0; i < 256; i++) HEX_TABLE[i] = i.toString(16).padStart(2, '0');

const toHex = (n: number) => HEX_TABLE[(n + 0.5) | 0];

/**
 * 根据插值系数 t 计算两个颜色的插值颜色构造器
 * 预计算 RGB 差值，每次调用只需 3 次乘加 + 查表
 * @param c0 起始颜色
 * @param c1 结束颜色
 * @returns 插值函数
 */
export const interpolateColor = (c0: string, c1: string) => {
  const [r0, g0, b0] = parseColor(c0);
  const [r1, g1, b1] = parseColor(c1);
  const dr = r1 - r0;
  const dg = g1 - g0;
  const db = b1 - b0;
  return (t: number) => `#${toHex(r0 + dr * t)}${toHex(g0 + dg * t)}${toHex(b0 + db * t)}`;
};

const MAX_CACHE_SIZE = 64;
const cache = new Map<string, ((t: number) => string)[]>();

/**
 * 根据颜色数组计算插值颜色函数构造器
 * @param colors 颜色数组
 * @returns 插值颜色函数
 */
export const interpolateColors = (colors: string[]) => {
  const key = colors.join(',');
  if (!cache.has(key)) {
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value!;
      cache.delete(firstKey);
    }
    const C = colors.slice(0, -1).map((c, i) => interpolateColor(c, colors[i + 1]));
    cache.set(key, C);
  }
  const interpolators = cache.get(key)!;
  return (t: number) => {
    const n = interpolators.length;
    const j = Math.min(n - 1, Math.floor(t * n));
    return interpolators[j](t * n - j);
  };
};
