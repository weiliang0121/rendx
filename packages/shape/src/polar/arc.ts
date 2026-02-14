import type {Path} from 'rendx-path';

import {createCircle} from '../primitives/circle';

/** 弧线配置 */
export interface ArcOptions {
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
  /** 弧线半径比例 (0~1) */
  radius: number;
}

/** 生成弧线路径（超过 2π 自动降级为完整圆） */
export const createArc = (path: Path, options: ArcOptions) => {
  const {cx, cy, r, startAngle, endAngle, radius} = options;
  const r1 = r * radius;
  const t0 = startAngle;
  const t1 = endAngle;
  if (Math.abs(t1 - t0) >= 2 * Math.PI) return createCircle(path, {cx, cy, r: r1});
  const largeArcFlag = Math.abs(t1 - t0) % (2 * Math.PI) > Math.PI ? 1 : 0;
  path.M(cx + r1 * Math.cos(t0), cy + r1 * Math.sin(t0));
  path.A(r1, r1, 0, largeArcFlag, 1, cx + r1 * Math.cos(t1), cy + r1 * Math.sin(t1));
};
