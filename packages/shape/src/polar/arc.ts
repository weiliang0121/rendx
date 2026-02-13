import type {Path} from '@dye/path';

import {createCircle} from '../primitives/circle';

export interface ArcOptions {
  cx: number;
  cy: number;
  r: number;
  startAngle: number;
  endAngle: number;
  radius: number;
}

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
