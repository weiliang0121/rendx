import type {Path} from '@dye/path';

import {createCircle, type CircleOptions, createRect, type RectOptions} from './primitives';
import {createArc, type ArcOptions, createSector, type SectorOptions} from './polar';
import {createLine, type LineOptions, createSegmentLine, type SegmentLineOptions, createArea, type AreaOptions, createSegmentArea, type SegmentAreaOptions, createBoxX, type BoxXOptions, createBoxY, type BoxYOptions} from './data';

interface ShapeOptionsMap {
  circle: CircleOptions;
  rect: RectOptions;
  arc: ArcOptions;
  sector: SectorOptions;
  line: LineOptions;
  segmentLine: SegmentLineOptions;
  area: AreaOptions;
  segmentArea: SegmentAreaOptions;
  boxX: BoxXOptions;
  boxY: BoxYOptions;
}

type ShapeType = keyof ShapeOptionsMap;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shapeCreators = new Map<string, (path: Path, options: any) => void>([
  ['circle', createCircle],
  ['rect', createRect],
  ['arc', createArc],
  ['sector', createSector],
  ['line', createLine],
  ['segmentLine', createSegmentLine],
  ['area', createArea],
  ['segmentArea', createSegmentArea],
  ['boxX', createBoxX],
  ['boxY', createBoxY],
]);

export const createShape = <T extends ShapeType>(path: Path, type: T, options: ShapeOptionsMap[T]) => {
  const creator = shapeCreators.get(type);
  if (!creator) throw new Error(`Unknown shape type: ${type}`);
  creator(path, options);
};
