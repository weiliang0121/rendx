export const r2d = 180 / Math.PI;
export const d2r = Math.PI / 180;
export const normalizeRadian = (r: number) => r % (2 * Math.PI);
export const normalizeDegree = (d: number) => d % 360;
export const calcCenter = (s: number, e: number, i: number, o: number): [number, number] => [(s + e) / 2, (i + o) / 2];
export const convertP2C = (d: number, r: number): [number, number] => [r * Math.cos(d), r * Math.sin(d)];
export const isNumEq = (a: number, b: number, p: number): boolean => Math.abs(a - b) < p;
export const inRange = (v: number, min: number, max: number): boolean => min <= v && v <= max;
export const clamper = (min: number, max: number) => {
  if (min > max) [min, max] = [max, min];
  return (v: number) => Math.min(max, Math.max(min, v));
};
