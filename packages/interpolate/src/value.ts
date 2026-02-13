import {lerp} from './number';
import {interpolateColor} from './color';

/**
 * 通用插值函数构造器，根据类型自动分派
 * @param a 起始值（number 或 color string）
 * @param b 结束值
 * @returns 插值函数
 */
export const interpolateValue = (a: number | string, b: number | string) => {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b);
  if (typeof a === 'string' && typeof b === 'string') return interpolateColor(a, b);
  return () => a;
};
