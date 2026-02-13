import {BoundingBox} from '@dye/bounding';

import {Shape} from '../core';

import {Point} from '@dye/core';

export class CircleShape extends Shape {
  command = 'circle' as const;

  cx: number = 0;
  cy: number = 0;
  r: number = 1;

  from(cx: number, cy: number, r: number) {
    this.cx = cx;
    this.cy = cy;
    this.r = r;
  }

  hit(point: Point) {
    const dx = point[0] - this.cx;
    const dy = point[1] - this.cy;
    return Math.sqrt(dx * dx + dy * dy) <= this.r;
  }

  box() {
    const {cx, cy, r} = this;
    this.boundingBox = BoundingBox.fromPoints(cx - r, cy - r, cx + r, cy + r);
    return this.boundingBox;
  }
}
