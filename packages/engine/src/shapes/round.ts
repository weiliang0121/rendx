import {BoundingBox} from '@dye/bounding';
import {createShape} from '@dye/shape';
import {Path} from '@dye/path';

import {Shape} from '../core';

export class RoundShape extends Shape {
  command = 'path' as const;

  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  rx: number | number[] | undefined = undefined;
  ry: number | number[] | undefined = undefined;

  options(rx: number | number[] | undefined, ry: number | number[] | undefined) {
    this.rx = rx;
    this.ry = ry;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  from(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (!this.creator) this.creator = new Path();
    else this.creator.clear();
    const {x, y, width, height, rx, ry} = this;
    createShape(this.creator, 'rect', {x, y, width, height, rx, ry});
    this.d = this.creator.toString();
    this.p = null;
    this.box();
    this.needUpdate = false;
  }

  path() {
    return this.d;
  }

  box() {
    const {x, y, width, height} = this;
    this.boundingBox = BoundingBox.fromRect(x, y, width, height);
    return this.boundingBox;
  }
}
