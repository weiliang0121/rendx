import {isNil, isNull, isNum, isStr, isUndef} from '../guards';
import {quickselect} from './quick-select';

export const count = (arr: unknown[], strict = true): number => {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (!isNil(arr[i]) && strict) count++;
    else count++;
  }
  return count;
};

export const min = (arr: number[]): number => {
  let min = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!isNum(v) || v !== v) continue;
    if (v < min) min = v;
  }
  return min;
};

export const minBy = <T>(arr: T[], fn: (d: T) => number): T => {
  let min = Infinity;
  let minD: T = arr[0];
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    const v = fn(d);
    if (!isNum(v) || v !== v) continue;
    if (v < min) {
      min = v;
      minD = d;
    }
  }
  return minD;
};

export const max = (arr: number[]): number => {
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!isNum(v) || v !== v) continue;
    if (v > max) max = v;
  }
  return max;
};

export const maxBy = <T>(arr: T[], fn: (d: T) => number): T => {
  let max = -Infinity;
  let maxD: T = arr[0];
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    const v = fn(d);
    if (!isNum(v) || v !== v) continue;
    if (v > max) {
      max = v;
      maxD = d;
    }
  }
  return maxD;
};

export const sum = (arr: number[]): number => {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!isNum(v) || v !== v) continue;
    sum += v;
  }
  return sum;
};

export const mean = (arr: number[]): number => sum(arr) / arr.length;

export const extent = (arr: number[]): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!isNum(arr[i]) || v !== v) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
};

export const extentBy = <T>(arr: T[], fn: (d: T) => number): [T | null, T | null] => {
  let min = Infinity;
  let max = -Infinity;
  let minD: T | null = null;
  let maxD: T | null = null;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    const v = fn(d);
    if (!isNum(v) || v !== v) continue;
    if (v < min) {
      min = v;
      minD = d;
    }
    if (v > max) {
      max = v;
      maxD = d;
    }
  }
  return [minD, maxD];
};

export const range = (start: number, stop: number, step: number = 1): number[] => {
  if (isUndef(stop)) [start, stop] = [0, start];
  start = Number(start);
  stop = Number(stop);
  step = Number(step);
  const n = Math.max(0, Math.ceil((stop - start) / step)) | 0;
  const result = new Array(n);
  for (let i = 0; i < n; i += 1) result[i] = start + i * step;
  return result;
};

export const uniqueArray = <T>(arr: T[]): T[] => {
  return Array.from(new Set(arr));
};

export const ascending = (a: unknown, b: unknown): number => {
  if (isNull(a) || isNull(b) || isUndef(a) || isUndef(b)) return NaN;
  if (isStr(a) && isStr(b)) return a.localeCompare(b);
  return a < b ? -1 : a > b ? 1 : a === b ? 0 : NaN;
};

export const descending = (a: unknown, b: unknown): number => {
  if (isNull(a) || isNull(b) || isUndef(a) || isUndef(b)) return NaN;
  if (isStr(a) && isStr(b)) return b.localeCompare(a);
  return b < a ? -1 : b > a ? 1 : b === a ? 0 : NaN;
};

export const quantile = (arr: number[], p: number): number => {
  const n = arr.length;
  if (n === 0) return NaN;
  if (n < 2) return arr[0];
  if (p <= 0) return min(arr);
  if (p >= 1) return max(arr);
  const h = (n - 1) * p;
  const i = Math.floor(h);
  quickselect(arr, i);
  const a = max(arr.slice(0, i + 1));
  const b = min(arr.slice(i + 1));
  return a + (b - a) * (h - i);
};

export const median = (arr: number[]): number => quantile(arr, 0.5);

export const arrayFromThresholds = (thresholds: number[], domain: [number, number]): [number, number][] => {
  const [min, max] = domain;
  const n = thresholds.length;
  if (n <= 0) return [[min, max]];
  const arr: [number, number][] = new Array(n + 1);
  arr[0] = [min, thresholds[0]];
  for (let i = 1; i < n; i++) arr[i] = [thresholds[i - 1], thresholds[i]];
  arr[n] = [thresholds[n - 1], max];
  return arr;
};

export const arrayFromRange = (range: number[]): [number, number][] => {
  const n = range.length;
  if (n <= 0) return [];
  if (n === 1) return [[range[0], range[0]]];
  const arr: [number, number][] = new Array(n - 1);
  for (let i = 1; i < n; i++) arr[i - 1] = [range[i - 1], range[i]];
  return arr;
};
