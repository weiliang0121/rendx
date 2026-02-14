import {BoundingBox} from 'rendx-bounding';

import {Shape} from '../core';

import {Point} from 'rendx-core';

/** 圆形形状，用于 Scene Graph 中的圆形节点 */
export class CircleShape extends Shape {
  command = 'circle' as const;

  cx: number = 0;
  cy: number = 0;
  r: number = 1;

  /**
   * 设置圆形参数
   * @param cx - 圆心 X
   * @param cy - 圆心 Y
   * @param r - 半径
   */
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
