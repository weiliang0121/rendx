import type {Path} from '@dye/path';
import {curveMap} from '@dye/curve';

export interface LineOptions {
  curve?: string;
  closed?: boolean;
  points: [number, number][];
}

export interface SegmentLineOptions {
  curve?: string;
  closed?: boolean;
  segments: [number, number][][];
}

export const createLine = (path: Path, options: LineOptions) => {
  const {curve = 'linear', closed = false, points} = options;
  if (Reflect.has(curveMap, curve)) curveMap[curve](path, points);
  if (points.length === 1) path.Z();
  if (closed) path.Z();
};

export const createSegmentLine = (path: Path, options: SegmentLineOptions): void => {
  const {curve, closed = false, segments} = options;
  const len = segments.length;
  for (let i = 0; i < len; i++) createLine(path, {curve, points: segments[i]});
  if (closed) path.Z();
};
