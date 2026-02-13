import {BoundingBox} from '@dye/bounding';

import {Shape} from '../core';

import type {Point} from '@dye/core';

export class RectShape extends Shape {
  command = 'rect' as const;

  x: number = 0;
  y: number = 0;
  width: number = 1;
  height: number = 1;

  from(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  hit(point: Point) {
    const [px, py] = point;
    const {x, y, width, height} = this;
    return x <= px && px <= x + width && y <= py && py <= y + height;
  }

  box() {
    const {x, y, width, height} = this;
    this.boundingBox = BoundingBox.fromRect(x, y, width, height);
    return this.boundingBox;
  }
}
