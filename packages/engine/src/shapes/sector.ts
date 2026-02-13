import {BoundingBox} from '@dye/bounding';
import {createShape} from '@dye/shape';
import {Path} from '@dye/path';

import {Shape} from '../core';
import {SectorTransform} from '../transforms';

import type {Point} from '@dye/core';

export class SectorShape extends Shape {
  command = 'path' as const;

  r: number = 1;
  startAngle: number = 0;
  endAngle: number = Math.PI * 2;
  padAngle: number | undefined = undefined;
  innerRadius: number = 0;
  outerRadius: number = 1;
  rc: number | number[] | undefined = undefined;

  transform: SectorTransform | null = null;

  options(rc: number | number[] | undefined) {
    this.rc = rc;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  from(r: number, startAngle: number, endAngle: number, innerRadius: number, outerRadius: number, padAngle?: number) {
    this.r = r;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.padAngle = padAngle;
    if (this.transform) {
      this.transform.V.startAngle = startAngle;
      this.transform.V.endAngle = endAngle;
      this.transform.V.innerRadius = innerRadius;
      this.transform.V.outerRadius = outerRadius;
    }
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (!this.creator) this.creator = new Path();
    else this.creator.clear();
    const {r, startAngle, endAngle, innerRadius, outerRadius, padAngle, rc} = this;
    createShape(this.creator, 'sector', {cx: 0, cy: 0, r, startAngle, endAngle, innerRadius, outerRadius, padAngle, rc});
    this.d = this.creator.toString();
    this.p = null;
    this.box();
    this.needUpdate = false;
  }

  path() {
    return this.d;
  }

  box() {
    const {r, startAngle, endAngle, innerRadius, outerRadius} = this;
    const points: Point[] = [];
    const r0 = innerRadius * r;
    const r1 = outerRadius * r;
    points.push([0, 0]);
    points.push([r1 * Math.cos(startAngle), r1 * Math.sin(startAngle)]);
    points.push([r1 * Math.cos(endAngle), r1 * Math.sin(endAngle)]);
    points.push([r0 * Math.cos(startAngle), r0 * Math.sin(startAngle)]);
    points.push([r0 * Math.cos(endAngle), r0 * Math.sin(endAngle)]);
    if (startAngle <= Math.PI && endAngle >= Math.PI) points.push([-r1, 0]);
    if (startAngle <= 0 && endAngle >= 0) points.push([r1, 0]);
    if (startAngle <= 1.5 * Math.PI && endAngle >= 1.5 * Math.PI) points.push([0, -r1]);
    if (startAngle <= 0.5 * Math.PI && endAngle >= 0.5 * Math.PI) points.push([0, r1]);
    const X = points.map(([x]) => x);
    const Y = points.map(([, y]) => y);
    const x0 = Math.min(...X);
    const x1 = Math.max(...X);
    const y0 = Math.min(...Y);
    const y1 = Math.max(...Y);
    this.boundingBox = BoundingBox.fromPoints(x0, y0, x1, y1);
    return this.boundingBox;
  }

  useTransform() {
    if (this.transform) return this;
    const {startAngle, endAngle, innerRadius, outerRadius} = this;
    this.transform = new SectorTransform({startAngle, endAngle, innerRadius, outerRadius});
    return this;
  }

  tick(time: number) {
    if (this.transform) {
      this.transform.interpolate(time);
      if (this.transform.status === 'running' || this.transform.status === 'last') {
        const {startAngle, endAngle, innerRadius, outerRadius} = this.transform.values;
        if (startAngle) this.startAngle = startAngle;
        if (endAngle) this.endAngle = endAngle;
        if (innerRadius) this.innerRadius = innerRadius;
        if (outerRadius) this.outerRadius = outerRadius;
        if (startAngle || endAngle || innerRadius || outerRadius) this.needUpdate = true;
      }
    }
    return this;
  }
}
