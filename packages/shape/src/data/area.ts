import type {Path} from 'rendx-path';
import {curveMap} from 'rendx-curve';

/** 面积图配置 */
export interface AreaOptions {
  /** 上边界点序列 */
  upperPoints: [number, number][];
  /** 下边界点序列 */
  lowerPoints: [number, number][];
  /** 统一曲线插值类型（默认 'linear'） */
  curve?: string;
  closed?: boolean;
  /** 上边界曲线类型（覆盖 curve） */
  upperCurve?: string;
  /** 下边界曲线类型（覆盖 curve） */
  lowerCurve?: string;
}

export interface SegmentAreaOptions {
  upperSegments: [number, number][][];
  lowerSegments: [number, number][][];
  curve?: string;
  upperCurve?: string;
  lowerCurve?: string;
}

/** 生成面积图路径（上下边界 + 曲线插值） */
export const createArea = (path: Path, options: AreaOptions) => {
  const {upperPoints, lowerPoints, curve = 'linear', upperCurve = curve, lowerCurve = curve} = options;
  if (Reflect.has(curveMap, upperCurve)) curveMap[upperCurve](path, upperPoints);
  const [x, y] = lowerPoints.at(-1) as [number, number];
  path.L(x, y);
  if (Reflect.has(curveMap, lowerCurve)) curveMap[lowerCurve](path, lowerPoints.reverse(), false);
  path.Z();
};

export const createSegmentArea = (path: Path, options: SegmentAreaOptions) => {
  const {upperSegments, lowerSegments, curve = 'linear', upperCurve = curve, lowerCurve = curve} = options;
  const length = Math.min(upperSegments.length, lowerSegments.length);
  for (let i = 0; i < length; i++) {
    createArea(path, {upperPoints: upperSegments[i], lowerPoints: lowerSegments[i], curve, upperCurve, lowerCurve});
  }
};
