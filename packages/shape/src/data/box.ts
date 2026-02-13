import type {Path} from '@dye/path';

export interface BoxXOptions {
  cx: number;
  minY: number;
  maxY: number;
  q1Y: number;
  q2Y: number;
  q3Y: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoxYOptions {
  cy: number;
  minX: number;
  maxX: number;
  q1X: number;
  q2X: number;
  q3X: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const createBoxX = (path: Path, options: BoxXOptions) => {
  const {cx, minY, maxY, q1Y, q2Y, q3Y, x, y, width, height} = options;
  path.clear();
  path
    .M(x, y)
    .H(x + width)
    .V(y + height)
    .H(x)
    .Z();
  path.M(cx, maxY).V(q3Y);
  path.M(cx, minY).V(q1Y);
  path.M(x, maxY).H(x + width);
  path.M(x, q2Y).H(x + width);
  path.M(x, minY).H(x + width);
};

export const createBoxY = (path: Path, options: BoxYOptions) => {
  const {cy, minX, maxX, q1X, q2X, q3X, x, y, width, height} = options;
  path.clear();
  path
    .M(x, y)
    .H(x + width)
    .V(y + height)
    .H(x)
    .Z();
  path.M(maxX, cy).H(q3X);
  path.M(minX, cy).H(q1X);
  path.M(maxX, y).V(y + height);
  path.M(q2X, y).V(y + height);
  path.M(minX, y).V(y + height);
};
