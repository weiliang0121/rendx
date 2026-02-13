import type {SymbolCreator} from './types';

export const createHLineSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  path.M(cx - r, cy);
  path.L(cx + r, cy);
  path.Z();
};

export const createVLineSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  path.M(cx, cy - r);
  path.L(cx, cy + r);
  path.Z();
};
