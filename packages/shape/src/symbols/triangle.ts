import type {Path} from 'rendx-path';
import type {SymbolCreator} from './types';

const createTriangle = (path: Path, cx: number, cy: number, r: number, points: [number, number][]) => {
  path.M(cx + points[0][0] * r, cy + points[0][1] * r);
  for (let i = 1; i < points.length; i++) path.L(cx + points[i][0] * r, cy + points[i][1] * r);
  path.Z();
};

export const createUpTriangleSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  createTriangle(path, +cx, +cy, +r, [
    [0, -1],
    [-1, 1],
    [1, 1],
  ]);
};

export const createDownTriangleSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  createTriangle(path, +cx, +cy, +r, [
    [0, 1],
    [-1, -1],
    [1, -1],
  ]);
};

export const createLeftTriangleSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  createTriangle(path, +cx, +cy, +r, [
    [-1, 0],
    [1, -1],
    [1, 1],
  ]);
};

export const createRightTriangleSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  createTriangle(path, +cx, +cy, +r, [
    [1, 0],
    [-1, -1],
    [-1, 1],
  ]);
};

export const createTriangleSymbol: SymbolCreator = createUpTriangleSymbol;
export const createInvertedTriangleSymbol: SymbolCreator = createDownTriangleSymbol;
