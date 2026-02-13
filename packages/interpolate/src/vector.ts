import {vec2} from 'gl-matrix';

/**
 * 球面二维向量插值构造器，预分配输出向量避免 GC
 * @param a 向量 a
 * @param b 向量 b
 * @returns 插值函数 (t) => vec2（注意：返回的 vec2 是复用对象）
 */
export const slerp = (a: vec2, b: vec2) => {
  const dot = vec2.dot(a, b);
  const clampedDot = Math.max(-1, Math.min(dot, 1));
  const angle = Math.acos(clampedDot);
  const sinAngle = Math.sin(angle);
  const out = vec2.clone(a);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (angle === 0 || sinAngle === 0) return (_t: number) => out;
  return (t: number) => {
    const s1 = Math.sin((1 - t) * angle) / sinAngle;
    const s2 = Math.sin(t * angle) / sinAngle;
    out[0] = s1 * a[0] + s2 * b[0];
    out[1] = s1 * a[1] + s2 * b[1];
    return out;
  };
};

/**
 * 向量插值函数构造器
 * 预计算差值 + 预分配输出 vec2，每次调用零分配
 * @param a 向量
 * @param b 向量
 * @returns 插值函数 (t) => vec2（注意：返回的 vec2 是复用对象）
 */
export const interpolateVec2 = (a: vec2, b: vec2) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const out = vec2.create();
  return (t: number) => {
    out[0] = a[0] + dx * t;
    out[1] = a[1] + dy * t;
    return out;
  };
};

/**
 * 角度插值函数构造器（最短路径）
 * 直接计算最短角度差，避免 slerp 的三角函数开销
 * @param a 起始角度（弧度）
 * @param b 结束角度（弧度）
 * @returns 插值函数 (t) => number
 */
export const interpolateRotate = (a: number, b: number) => {
  let d = b - a;
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  return (t: number) => a + d * t;
};
