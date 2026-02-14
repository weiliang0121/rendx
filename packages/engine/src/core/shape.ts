import {BoundingBox} from 'rendx-bounding';
import {uid8} from 'rendx-core';

import type {AO, Point} from 'rendx-core';
import type {Path} from 'rendx-path';

export type ShapeCommand = 'text' | 'circle' | 'rect' | 'line' | 'path' | 'image' | '';

/**
 * 图形形状基类。子类通过 from() 设置参数，build() 触发包围盒计算。
 * command 指定渲染器的绘制方法：'text' | 'circle' | 'rect' | 'line' | 'path' | 'image'
 */
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

  /** 按属性名列表获取值（序列化用），避免 as any */
  getProps(keys: string[]): unknown[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as Record<string, any>;
    return keys.map(k => self[k]);
  }

  /** 接收节点属性（子类按需 override，如 TextShape 用于文本测量） */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setAttrs(_attrs: AO) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  options(..._args: any[]) {}

  /** 子类覆写此方法设置形状参数（如 CircleShape.from(cx, cy, r)） */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  from(..._args: any[]) {}

  /** 构建形状：计算包围盒和路径数据，仅在 needUpdate 时执行 */
  build() {
    if (!this.needUpdate) return;
    this.box();
    this.needUpdate = false;
  }

  /** 返回 SVG 路径字符串（d 属性） */
  path(): string {
    return this.d;
  }

  /** 返回缓存的 Path2D 对象（用于 Canvas 命中检测） */
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

  /**
   * 点命中检测（默认使用包围盒，子类可覆写用 path2d 精确检测）
   * @param point - 本地坐标 [x, y]
   */
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
