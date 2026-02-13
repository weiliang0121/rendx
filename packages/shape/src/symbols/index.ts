import {Path} from '@dye/path';
import type {SymbolOptions, SymbolCreator} from './types';
import {createCircleSymbol} from './circle';
import {createCrossSymbol} from './cross';
import {createDiamondSymbol} from './diamond';
import {createSquareSymbol} from './square';
import {createUpTriangleSymbol, createDownTriangleSymbol, createLeftTriangleSymbol, createRightTriangleSymbol} from './triangle';
import {createHLineSymbol, createVLineSymbol} from './line';
import {createClosedEyeSymbol, createEyeSymbol} from './eye';
import {createResetSymbol} from './reset';
import {createSelectSymbol} from './select';

// 统一 re-export 所有 symbol
export * from './types';
export * from './circle';
export * from './cross';
export * from './diamond';
export * from './square';
export * from './star';
export * from './triangle';
export * from './wye';
export * from './line';
export * from './eye';
export * from './reset';
export * from './select';

const fillSymbolMap: Record<string, SymbolCreator> = {
  circle: createCircleSymbol,
  cross: createCrossSymbol,
  diamond: createDiamondSymbol,
  square: createSquareSymbol,
  triangle: createUpTriangleSymbol,
  iTriangle: createDownTriangleSymbol,
  upTriangle: createUpTriangleSymbol,
  downTriangle: createDownTriangleSymbol,
  leftTriangle: createLeftTriangleSymbol,
  rightTriangle: createRightTriangleSymbol,
};

const featureSymbolMap: Record<string, SymbolCreator> = {
  line: createHLineSymbol,
  hLine: createHLineSymbol,
  vLine: createVLineSymbol,
  eye: createEyeSymbol,
  closedEye: createClosedEyeSymbol,
  reset: createResetSymbol,
  select: createSelectSymbol,
};

export const fillSymbols = Object.keys(fillSymbolMap) as string[];

export const createSymbol = (path: Path, symbol: string, options: SymbolOptions) => {
  if (fillSymbolMap[symbol]) fillSymbolMap[symbol](path, options);
  else if (featureSymbolMap[symbol]) featureSymbolMap[symbol](path, options);
  else fillSymbolMap.circle(path, options);
};
