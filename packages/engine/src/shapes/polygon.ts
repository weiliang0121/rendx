import {BoundingBox} from '@dye/bounding';
import {createShape} from '@dye/shape';
import {extent} from '@dye/core';
import {Path} from '@dye/path';

import {Shape} from '../core';

import type {Point} from '@dye/core';

export class PolygonShape extends Shape {
  command = 'path' as const;

  points: Point[] = [];
  curve: string = 'linear';
  closed: boolean = true;

  options(curve: string, closed: boolean = true) {
    this.curve = curve;
    this.closed = closed;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  from(points: Point[]) {
    this.points = points;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (!this.creator) this.creator = new Path();
    else this.creator.clear();
    const {points, curve, closed} = this;
    createShape(this.creator, 'line', {points, curve, closed});
    this.d = this.creator.toString();
    this.p = null;
    this.box();
    this.needUpdate = false;
  }

  path() {
    return this.d;
  }

  box() {
    const {points} = this;
    const [x0, x1] = extent(points.map(([x]) => x));
    const [y0, y1] = extent(points.map(([, y]) => y));
    this.boundingBox = BoundingBox.fromPoints(x0, y0, x1, y1);
    return this.boundingBox;
  }
}
