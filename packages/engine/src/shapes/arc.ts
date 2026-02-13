import {BoundingBox} from '@dye/bounding';
import {createShape} from '@dye/shape';
import {extent} from '@dye/core';
import {Path} from '@dye/path';

import {Shape} from '../core';
import {ArcTransform} from '../transforms';

import type {Point} from '@dye/core';

export class ArcShape extends Shape {
  command = 'path' as const;

  r: number = 1;
  startAngle: number = 0;
  endAngle: number = Math.PI * 2;
  radius: number = 1;

  transform: ArcTransform | null = null;

  from(r: number, startAngle: number, endAngle: number, radius: number) {
    this.r = r;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.radius = radius;
    if (this.transform) {
      this.transform.V.startAngle = startAngle;
      this.transform.V.endAngle = endAngle;
    }
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (!this.creator) this.creator = new Path();
    else this.creator.clear();
    const {r, startAngle, endAngle, radius} = this;
    createShape(this.creator, 'arc', {cx: 0, cy: 0, r, startAngle, endAngle, radius});
    this.d = this.creator.toString();
    this.p = null;
    this.box();
    this.needUpdate = false;
  }

  path() {
    return this.d;
  }

  box() {
    const {r, startAngle, endAngle, radius} = this;
    const points: Point[] = [];
    const r1 = r * radius;
    const midAngle = (startAngle + endAngle) / 2;
    points.push([r1 * Math.cos(startAngle), r1 * Math.sin(startAngle)]);
    points.push([r1 * Math.cos(midAngle), r1 * Math.sin(midAngle)]);
    points.push([r1 * Math.cos(endAngle), r1 * Math.sin(endAngle)]);
    const X = points.map(([x]) => x);
    const Y = points.map(([, y]) => y);
    const [x0, x1] = extent(X);
    const [y0, y1] = extent(Y);
    this.boundingBox = BoundingBox.fromPoints(x0, y0, x1, y1);
    return this.boundingBox;
  }

  useTransform() {
    if (this.transform) return this;
    this.transform = new ArcTransform({startAngle: this.startAngle, endAngle: this.endAngle});
    return this;
  }

  tick(time: number) {
    if (this.transform) {
      this.transform.interpolate(time);
      if (this.transform.status === 'running' || this.transform.status === 'last') {
        const {startAngle, endAngle} = this.transform.values;
        if (startAngle) this.startAngle = startAngle;
        if (endAngle) this.endAngle = endAngle;
        if (startAngle || endAngle) this.needUpdate = true;
      }
    }
    return this;
  }
}
