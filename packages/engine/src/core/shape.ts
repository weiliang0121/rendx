import {BoundingBox} from '@dye/bounding';
import {uid8} from '@dye/core';

import type {Point} from '@dye/core';
import type {Path} from '@dye/path';

export type ShapeCommand = 'text' | 'circle' | 'rect' | 'line' | 'path' | '';

export class Shape {
  uid: string = uid8();

  type: number = 0;

  name: string = '';

  command: ShapeCommand = '';

  boundingBox: BoundingBox = new BoundingBox();

  creator: Path | null = null;
  d: string = '';
  p: Path2D | null = null;

  autoNeedUpdate: boolean = true;
  needUpdate: boolean = true;

  setBox(box: BoundingBox) {
    this.boundingBox = box;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  options(..._args: any[]) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  from(..._args: any[]) {}

  build() {
    if (!this.needUpdate) return;
    this.box();
    this.needUpdate = false;
  }

  path(): string {
    return this.d;
  }

  path2d() {
    if (!this.p) this.p = new Path2D(this.d);
    return this.p;
  }

  box(): BoundingBox {
    return this.boundingBox;
  }

  useTransform() {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(_time: number) {}

  hit(point: Point) {
    if (!this.boundingBox) this.box();
    if (!this.boundingBox) return false;
    return this.boundingBox.containsPoint(point[0], point[1]);
  }

  clear() {
    this.needUpdate = true;
    this.autoNeedUpdate = true;
  }

  dispose() {
    this.clear();
  }
}
