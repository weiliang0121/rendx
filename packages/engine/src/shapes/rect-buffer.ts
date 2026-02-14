import {BoundingBox} from 'rendx-bounding';
import {createShape} from 'rendx-shape';
import {Path} from 'rendx-path';

import {Shape} from '../core';

import type {Point} from 'rendx-core';

export class RectBufferShape extends Shape {
  type: number = 3;

  command = 'path' as const;

  mode: 'render' | 'compute' = 'render';

  buffer: Float32Array = new Float32Array(0);

  hitIndex: number = -1;

  from(buffer: Float32Array) {
    this.buffer = buffer;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (this.mode === 'render') {
      if (!this.creator) this.creator = new Path();
      else this.creator.clear();
      const {buffer} = this;
      for (let i = 0; i < buffer.length; i += 4) {
        const x = buffer[i];
        const y = buffer[i + 1];
        const width = buffer[i + 2];
        const height = buffer[i + 3];
        createShape(this.creator, 'rect', {x, y, width, height});
      }
      this.d = this.creator.toString();
      this.p = null;
    }
    this.needUpdate = false;
  }

  hit(point: Point) {
    const [px, py] = point;
    const {buffer} = this;
    for (let i = 0; i < buffer.length; i += 4) {
      const x = buffer[i];
      const y = buffer[i + 1];
      const width = buffer[i + 2];
      const height = buffer[i + 3];
      if (x <= px && px <= x + width && y <= py && py <= y + height) {
        this.hitIndex = Math.floor(i / 4);
        return true;
      }
    }
    this.hitIndex = -1;
    return false;
  }

  box() {
    const {buffer} = this;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < buffer.length; i += 4) {
      const x = buffer[i];
      const y = buffer[i + 1];
      const width = buffer[i + 2];
      const height = buffer[i + 3];
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + width);
      y1 = Math.max(y1, y + height);
    }
    this.boundingBox = BoundingBox.fromPoints(x0, y0, x1, y1);
    return this.boundingBox;
  }
}
