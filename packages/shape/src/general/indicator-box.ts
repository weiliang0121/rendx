import type {Path} from 'rendx-path';

export interface IndicatorBoxOptions {
  anchor: 'top' | 'bottom' | 'left' | 'right';
  anchorSize: number;
  width: number;
  height: number;
}

export const createIndicatorBox = (path: Path, options: IndicatorBoxOptions) => {
  const {anchor, anchorSize: s, width: w, height: h} = options;
  const s2 = s / 2;
  const w2 = w / 2;
  const h2 = h / 2;

  if (anchor === 'top') {
    path.M(-w2, s);
    path.L(-s2, s);
    path.L(0, 0);
    path.L(s2, s);
    path.L(w2, s);
    path.L(w2, h + s);
    path.L(-w2, h + s);
    path.Z();
  } else if (anchor === 'bottom') {
    path.M(-w2, -h - s);
    path.L(w2, -h - s);
    path.L(w2, -s);
    path.L(s2, -s);
    path.L(0, 0);
    path.L(-s2, -s);
    path.L(-w2, -s);
    path.Z();
  } else if (anchor === 'left') {
    path.M(s, -h2);
    path.L(s, -s2);
    path.L(0, 0);
    path.L(s, s2);
    path.L(s, h2);
    path.L(w + s, h2);
    path.L(w + s, -h2);
    path.Z();
  } else if (anchor === 'right') {
    path.M(-w - s, -h2);
    path.L(-w - s, h2);
    path.L(-s, h2);
    path.L(-s, s2);
    path.L(0, 0);
    path.L(-s, -s2);
    path.L(-s, -h2);
    path.Z();
  }
};
