import {BoundingBox} from '@dye/bounding';
import {createShape} from '@dye/shape';
import {extent} from '@dye/core';
import {Path} from '@dye/path';

import {Shape} from '../core';

import type {Point} from '@dye/core';

export class AreaShape extends Shape {
  command = 'path' as const;

  upperSegments: Point[][] = [];
  lowerSegments: Point[][] = [];
  curve: string = 'linear';

  options(curve: string) {
    this.curve = curve;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  from(upperSegments: Point[][], lowerSegments: Point[][]) {
    this.upperSegments = upperSegments;
    this.lowerSegments = lowerSegments;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (!this.creator) this.creator = new Path();
    else this.creator.clear();
    const {upperSegments, lowerSegments, curve} = this;
    createShape(this.creator, 'segmentArea', {upperSegments, lowerSegments, curve});
    this.d = this.creator.toString();
    this.p = null;
    this.box();
    this.needUpdate = false;
  }

  path() {
    return this.d;
  }

  box() {
    const {upperSegments, lowerSegments} = this;
    const U = upperSegments.flat();
    const L = lowerSegments.flat();
    const P = U.concat(L);
    const [x0, x1] = extent(P.map(([x]) => x));
    const [y0, y1] = extent(P.map(([, y]) => y));
    this.boundingBox = BoundingBox.fromPoints(x0, y0, x1, y1);
    return this.boundingBox;
  }
}
