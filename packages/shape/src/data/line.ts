import type {Path} from 'rendx-path';
import {curveMap} from 'rendx-curve';

/** 折线配置 */
export interface LineOptions {
  /** 曲线插值类型（'linear' | 'natural' | 'monotone' 等，默认 'linear'） */
  curve?: string;
  /** 是否闭合 */
  closed?: boolean;
  /** 端点坐标序列 */
  points: [number, number][];
}

export interface SegmentLineOptions {
  curve?: string;
  closed?: boolean;
  segments: [number, number][][];
}

/** 生成折线路径（支持曲线插值） */
export const createLine = (path: Path, options: LineOptions) => {
  const {curve = 'linear', closed = false, points} = options;
  if (Reflect.has(curveMap, curve)) curveMap[curve](path, points);
  if (points.length === 1) path.Z();
  if (closed) path.Z();
};

/** 生成分段折线路径（多段独立折线） */
export const createSegmentLine = (path: Path, options: SegmentLineOptions): void => {
  const {curve, closed = false, segments} = options;
  const len = segments.length;
  for (let i = 0; i < len; i++) createLine(path, {curve, points: segments[i]});
  if (closed) path.Z();
};
