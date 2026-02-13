import type {Path} from '@dye/path';

export interface RingOptions {
  cx: number;
  cy: number;
  r: number;
  innerRadius: number;
  outerRadius: number;
}

export const createRing = (path: Path, options: RingOptions) => {
  const {cx, cy, r, innerRadius, outerRadius} = options;
  const r0 = innerRadius * r;
  const r1 = outerRadius * r;
  path.M(cx, cy - r1);
  path.A(r1, r1, 0, 1, 0, cx, cy + r1);
  path.L(cx, cy + r0);
  path.A(r0, r0, 0, 1, 1, cx, cy - r0);
  path.Z();
  path.M(cx, cy - r0);
  path.A(r0, r0, 0, 1, 1, cx, cy + r0);
  path.L(cx, cy + r1);
  path.A(r1, r1, 0, 1, 0, cx, cy - r1);
  path.Z();
};
