import type {SymbolCreator} from './types';

export const createEyeSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  path.M(cx, cy - r);
  path.A(r, r, 0, 1, 0, cx, cy + r);
  path.A(r, r, 0, 1, 0, cx, cy - r);
  path.Z();
};

export const createClosedEyeSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  const rx = (r * 2) / 3;
  const ry = r / 2;
  const r2 = r / 5;
  const dx = (r * 2) / 3 + 2;
  const dy = r / 5 + 2;

  path.M(cx - rx, cy);
  path.A(rx, ry, 0, 1, 0, cx + rx, cy);
  path.A(rx, ry, 0, 1, 0, cx - rx, cy);
  path.M(cx - r2, cy);
  path.A(r2, r2, 0, 1, 1, cx + r2, cy);
  path.A(r2, r2, 0, 1, 1, cx - r2, cy);
  path.M(cx - dx, cy + dy);
  path.L(cx + dx, cy - dy);
};
