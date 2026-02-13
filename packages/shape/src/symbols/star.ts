import type {SymbolCreator} from './types';

// 预计算五角星 10 个顶点的单位偏移量（外点 + 内点交替）
const STAR_COS: number[] = [];
const STAR_SIN: number[] = [];
for (let i = 0; i < 5; i++) {
  const a0 = ((i * 72 - 18) * Math.PI) / 180;
  const a1 = a0 + (36 * Math.PI) / 180;
  STAR_COS.push(Math.cos(a0), 0.5 * Math.cos(a1));
  STAR_SIN.push(Math.sin(a0), 0.5 * Math.sin(a1));
}

export const createStarSymbol: SymbolCreator = (path, {cx, cy, r}) => {
  path.M(cx + r * STAR_COS[0], cy + r * STAR_SIN[0]);
  for (let i = 1; i < 10; i++) {
    path.L(cx + r * STAR_COS[i], cy + r * STAR_SIN[i]);
  }
  path.Z();
};
