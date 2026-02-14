import {BoundingBox} from 'rendx-bounding';

import {Shape} from '../core';

import type {Point} from 'rendx-core';

/** 矩形形状 */
export class RectShape extends Shape {
  command = 'rect' as const;

  x: number = 0;
  y: number = 0;
  width: number = 1;
  height: number = 1;

  /**
   * 设置矩形参数
   * @param x - 左上角 X
   * @param y - 左上角 Y
   * @param width - 宽度
   * @param height - 高度
   */
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
