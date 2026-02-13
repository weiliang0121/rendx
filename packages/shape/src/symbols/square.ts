import type {SymbolCreator} from './types';

export const createSquareSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  path.M(cx - r, cy - r);
  path.L(cx + r, cy - r);
  path.L(cx + r, cy + r);
  path.L(cx - r, cy + r);
  path.Z();
};
