import type {Path} from 'rendx-path';
import {isNum, isUndef} from 'rendx-core';

/** 矩形配置 */
export interface RectOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 圆角 X 半径（数字为统一圆角，4元素数组为独立圆角 [tl, tr, br, bl]） */
  rx?: number | number[];
  /** 圆角 Y 半径 */
  ry?: number | number[];
}

export const createRectNormal = (path: Path, {x, y, width, height}: RectOptions) => {
  path.M(x, y);
  path.L(x + width, y);
  path.L(x + width, y + height);
  path.L(x, y + height);
  path.Z();
};

export const createRectRounded = (path: Path, {x, y, width, height, rx, ry}: RectOptions) => {
  if (isNum(rx)) rx = [rx, rx, rx, rx] as unknown as number[];
  if (isNum(ry)) ry = [ry, ry, ry, ry] as unknown as number[];
  const [rx1, rx2, rx3 = rx1, rx4 = rx2] = (rx as number[]).map(Number).map(r => Math.min(r, width / 2)) as number[];
  const [ry1, ry2, ry3 = ry1, ry4 = ry2] = (ry as number[]).map(Number).map(r => Math.min(r, height / 2)) as number[];
  path.M(x + rx1, y);
  path.L(x + width - rx2, y);
  path.A(rx2, ry2, 0, 0, 1, x + width, y + ry2);
  path.L(x + width, y + height - ry3);
  path.A(rx3, ry3, 0, 0, 1, x + width - rx3, y + height);
  path.L(x + rx4, y + height);
  path.A(rx4, ry4, 0, 0, 1, x, y + height - ry4);
  path.L(x, y + ry1);
  path.A(rx1, ry1, 0, 0, 1, x + rx1, y);
  path.Z();
};

/** 生成矩形路径（自动根据 rx/ry 选择普通或圆角矩形） */
export const createRect = (path: Path, options: RectOptions) => {
  const {rx, ry} = options;
  if (!isUndef(rx) && rx !== 0 && !isUndef(ry) && ry !== 0) createRectRounded(path, options);
  else createRectNormal(path, options);
};
