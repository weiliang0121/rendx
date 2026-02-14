import type {Path} from 'rendx-path';
import {isNum, isUndef} from 'rendx-core';

import {createRing} from './ring';

/** 扇形配置 */
export interface SectorOptions {
  /** 圆心 X */
  cx: number;
  /** 圆心 Y */
  cy: number;
  /** 基准半径 */
  r: number;
  /** 起始角度（弧度） */
  startAngle: number;
  /** 结束角度（弧度） */
  endAngle: number;
  /** 扇形间 pad 角度 */
  padAngle?: number;
  /** 内半径比例 (0~1) */
  innerRadius: number;
  /** 外半径比例 (0~1) */
  outerRadius: number;
  /** 圆角半径（数字为统一，4元素数组为 [outerLeft, innerLeft, outerRight, innerRight]） */
  rc?: number | number[];
}

export const createSectorNormal = (path: Path, options: SectorOptions) => {
  const {cx, cy, r, startAngle, endAngle, innerRadius, outerRadius} = options;
  const r0 = innerRadius * r;
  const r1 = outerRadius * r;
  const t0 = startAngle;
  const t1 = endAngle;
  if (Math.abs(t1 - t0) >= 2 * Math.PI) return createRing(path, {cx, cy, r, innerRadius, outerRadius});
  const largeArcFlag = (t1 - t0) % (2 * Math.PI) > Math.PI ? 1 : 0;
  path.M(cx + r1 * Math.cos(t0), cy + r1 * Math.sin(t0));
  path.A(r1, r1, 0, largeArcFlag, 1, cx + r1 * Math.cos(t1), cy + r1 * Math.sin(t1));
  if (r0 === 0) {
    path.L(cx, cy);
  } else {
    path.L(cx + r0 * Math.cos(t1), cy + r0 * Math.sin(t1));
    path.A(r0, r0, 0, largeArcFlag, 0, cx + r0 * Math.cos(t0), cy + r0 * Math.sin(t0));
  }
  path.Z();
};

interface Tangent {
  ot: number;
  cx: number;
  cy: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  rc: number;
}

const tangent = (t: number, t0: number, r: number, rc: number, outer: boolean, left: boolean): Tangent => {
  const rc0 = outer ? (r * Math.sin(t / 2)) / (1 + Math.sin(t / 2)) : (r * Math.sin(t / 2)) / (1 - Math.sin(t / 2));
  if (rc > rc0) rc = rc0;
  const sign = outer ? 1 : -1;
  const ot = Math.asin(rc / (r + sign * rc));
  const t1 = left ? (t0 + ot) % (2 * Math.PI) : (t0 - ot) % (2 * Math.PI);
  const r0 = (r + sign * rc) * Math.cos(ot);
  return {
    ot,
    cx: (r + sign * rc) * Math.cos(t1),
    cy: (r + sign * rc) * Math.sin(t1),
    x0: r0 * Math.cos(t0),
    y0: r0 * Math.sin(t0),
    x1: r * Math.cos(t1),
    y1: r * Math.sin(t1),
    rc,
  };
};

const epsilon = 1e-6;

export const createSectorRounded = (path: Path, options: SectorOptions) => {
  const {cx, cy, r, startAngle, endAngle, innerRadius, outerRadius} = options;
  let {rc} = options;
  if (isNum(rc)) rc = [rc, rc, rc, rc];
  const r0 = innerRadius * r;
  const r1 = outerRadius * r;
  const t0 = startAngle;
  const t1 = endAngle;
  const dt = Math.abs(t1 - t0);
  const dr = Math.abs(r1 - r0);
  if (Math.abs(t1 - t0) >= 2 * Math.PI) return createRing(path, {cx, cy, r, innerRadius, outerRadius});
  const [rc01, rc00, rc11 = rc01, rc10 = rc00] = rc!.map(x => Math.max(0, Math.min(x, dr / 2))) as number[];
  if (dt < 1e-6) return;
  const c01 = tangent(dt, t0, r1, rc01, true, true);
  const c11 = tangent(dt, t1, r1, rc11, true, false);
  let largeArcFlag = dt - c01.ot - c11.ot > Math.PI - epsilon ? 1 : 0;
  path.M(cx + c01.x0, cy + c01.y0);
  path.A(c01.rc, c01.rc, 0, 0, 1, cx + c01.x1, cy + c01.y1);
  path.A(r1, r1, 0, largeArcFlag, 1, cx + c11.x1, cy + c11.y1);
  path.A(c11.rc, c11.rc, 0, 0, 1, cx + c11.x0, cy + c11.y0);
  if (r0 === 0) {
    path.L(cx, cy);
  } else {
    const c00 = tangent(dt, t0, r0, rc00, false, true);
    const c10 = tangent(dt, t1, r0, rc10, false, false);
    largeArcFlag = dt - c00.ot - c10.ot > Math.PI - epsilon ? 1 : 0;
    path.L(cx + c10.x0, cy + c10.y0);
    path.A(c10.rc, c10.rc, 0, 0, 1, cx + c10.x1, cy + c10.y1);
    path.A(r0, r0, 0, largeArcFlag, 0, cx + c00.x1, cy + c00.y1);
    path.A(c00.rc, c00.rc, 0, 0, 1, cx + c00.x0, cy + c00.y0);
  }
  path.Z();
};

export const createSector = (path: Path, options: SectorOptions) => {
  const {rc, startAngle, endAngle, padAngle = 0} = options;
  const da = Math.abs(endAngle - startAngle) - padAngle;
  if (da <= 1e-4) return;
  const hp = padAngle / 2;
  options.startAngle = startAngle + hp;
  options.endAngle = endAngle - hp;
  if (!isUndef(rc) && rc !== 0) createSectorRounded(path, options);
  else createSectorNormal(path, options);
};
