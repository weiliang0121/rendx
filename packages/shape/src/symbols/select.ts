import type {SymbolCreator} from './types';

export const createSelectSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  path.M(cx - 0.5 * r, cy + 0.2 * r);
  path.L(cx - 0.5 * r, cy + r);
  path.L(cx + r, cy + r);
  path.L(cx + r, cy - 0.5 * r);
  path.L(cx + 0.2 * r, cy - 0.5 * r);
  path.M(cx - r, cy - 0.5 * r);
  path.L(cx, cy - 0.5 * r);
  path.M(cx - 0.5 * r, cy - r);
  path.L(cx - 0.5 * r, cy);
};
