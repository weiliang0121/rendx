import {BoundingBox} from 'rendx-bounding';

import {Shape} from '../core';

/** 线段形状 */
export class LineShape extends Shape {
  command = 'line' as const;

  x1: number = 0;
  y1: number = 0;
  x2: number = 1;
  y2: number = 1;

  /**
   * 设置线段端点
   * @param x1 - 起点 X
   * @param y1 - 起点 Y
   * @param x2 - 终点 X
   * @param y2 - 终点 Y
   */
  from(x1: number, y1: number, x2: number, y2: number) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.d = `M${x1} ${y1} L${x2} ${y2}`;
    this.p = null;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  path2d() {
    if (!this.p) this.p = new Path2D(this.d);
    return this.p;
  }

  box() {
    const {x1, y1, x2, y2} = this;
    this.boundingBox = BoundingBox.fromPoints(x1, y1, x2, y2);
    return this.boundingBox;
  }
}
