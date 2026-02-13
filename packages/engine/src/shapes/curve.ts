import {BoundingBox} from '@dye/bounding';
import {createShape} from '@dye/shape';
import {extent} from '@dye/core';
import {Path} from '@dye/path';

import {Shape} from '../core';

import type {Point} from '@dye/core';

export class CurveShape extends Shape {
  command = 'path' as const;

  segments: Point[][] = [];
  curve: string = 'linear';
  closed: boolean = false;

  options(curve: string, closed: boolean) {
    this.curve = curve;
    this.closed = closed;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  from(segments: Point[][]) {
    this.segments = segments;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (!this.creator) this.creator = new Path();
    else this.creator.clear();
    const {segments, curve, closed} = this;
    createShape(this.creator, 'segmentLine', {segments, curve, closed});
    this.d = this.creator.toString();
    this.p = null;
    this.box();
    this.needUpdate = false;
  }

  path() {
    return this.d;
  }

  box() {
    const segments = this.segments.flat();
    const [x0, x1] = extent(segments.map(([x]) => x));
    const [y0, y1] = extent(segments.map(([, y]) => y));
    this.boundingBox = BoundingBox.fromPoints(x0, y0, x1, y1);
    return this.boundingBox;
  }
}
