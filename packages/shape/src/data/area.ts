import type {Path} from '@dye/path';
import {curveMap} from '@dye/curve';

export interface AreaOptions {
  upperPoints: [number, number][];
  lowerPoints: [number, number][];
  curve?: string;
  closed?: boolean;
  upperCurve?: string;
  lowerCurve?: string;
}

export interface SegmentAreaOptions {
  upperSegments: [number, number][][];
  lowerSegments: [number, number][][];
  curve?: string;
  upperCurve?: string;
  lowerCurve?: string;
}

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
