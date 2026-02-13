import type {SymbolCreator} from './types';

export const createCrossSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  const lw = r * 0.382;
  path.M(cx - r, cy - lw);
  path.L(cx - lw, cy - lw);
  path.L(cx - lw, cy - r);
  path.L(cx + lw, cy - r);
  path.L(cx + lw, cy - lw);
  path.L(cx + r, cy - lw);
  path.L(cx + r, cy + lw);
  path.L(cx + lw, cy + lw);
  path.L(cx + lw, cy + r);
  path.L(cx - lw, cy + r);
  path.L(cx - lw, cy + lw);
  path.L(cx - r, cy + lw);
  path.Z();
};
