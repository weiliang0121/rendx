import type {Path} from 'rendx-path';

/** 圆形配置 */
export interface CircleOptions {
  /** 圆心 X */
  cx: number;
  /** 圆心 Y */
  cy: number;
  /** 半径 */
  r: number;
}

/** 生成圆形 SVG 路径（两段弧组成完整圆） */
export const createCircle = (path: Path, {cx, cy, r}: CircleOptions) => {
  path.M(cx, cy - r);
  path.A(r, r, 0, 1, 0, cx, cy + r);
  path.A(r, r, 0, 1, 0, cx, cy - r);
  path.Z();
};
