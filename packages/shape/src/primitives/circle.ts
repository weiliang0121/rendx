import type {Path} from '@dye/path';

export interface CircleOptions {
  cx: number;
  cy: number;
  r: number;
}

export const createCircle = (path: Path, {cx, cy, r}: CircleOptions) => {
  path.M(cx, cy - r);
  path.A(r, r, 0, 1, 0, cx, cy + r);
  path.A(r, r, 0, 1, 0, cx, cy - r);
  path.Z();
};
