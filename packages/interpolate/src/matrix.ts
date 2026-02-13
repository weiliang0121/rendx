import {mat2d, vec2} from 'gl-matrix';

import {interpolateVec2, interpolateRotate} from './vector';

/**
 * 解构矩阵为 TRS 分量
 * @param mat 矩阵
 * @returns 平移、旋转、缩放
 */
export const decompose = (mat: mat2d) => {
  const [a, b, c, d, e, f] = mat;
  const translation = vec2.fromValues(e, f);
  const scale = vec2.fromValues(Math.hypot(a, b), Math.hypot(c, d));
  const rotation = Math.atan2(b, a);
  return {translation, rotation, scale};
};

/**
 * 插值矩阵函数构造器
 * 预分配输出矩阵，每次调用复用同一对象
 * @param a 起始矩阵
 * @param b 结束矩阵
 * @returns 插值矩阵函数 (t) => mat2d（注意：返回的 mat2d 是复用对象）
 */
export const interpolateMat2d = (a: mat2d, b: mat2d) => {
  const {translation: ta, rotation: ra, scale: sa} = decompose(a);
  const {translation: tb, rotation: rb, scale: sb} = decompose(b);
  const is = interpolateVec2(sa, sb);
  const ir = interpolateRotate(ra, rb);
  const it = interpolateVec2(ta, tb);
  const out = mat2d.create();
  return (t: number) => {
    const s = is(t);
    const r = ir(t);
    const p = it(t);
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    out[0] = cos * s[0];
    out[1] = sin * s[0];
    out[2] = -sin * s[1];
    out[3] = cos * s[1];
    out[4] = p[0];
    out[5] = p[1];
    return out;
  };
};
