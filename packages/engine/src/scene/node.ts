import {mat2d, vec2} from 'gl-matrix';

import {BoundingBox} from 'rendx-bounding';
import {Graphics, Shape, Attributes} from '../core';
import {createShape} from '../shapes';

import {isHit} from '../core/canvas-hit';

import type {AO, Point} from 'rendx-core';

/**
 * 叶子节点（type=3），场景图中的可渲染单元。
 * 每个 Node 持有一个 Shape（几何形状）和一个 Attributes（视觉属性）。
 *
 * @example
 * ```ts
 * const node = Node.create('circle', { fill: 'red', stroke: '#000' });
 * node.shape.from(100, 200, 50); // cx, cy, r
 * node.translate(10, 20);
 * scene.add(node);
 * ```
 */
export class Node extends Graphics {
  type: number = 3;

  /** Shape 注册类型名（如 'rect', 'circle' 等），序列化时使用 */
  shapeType: string = '';

  shape: Shape;
  attrs: Attributes;

  #invertWorldMatrix: mat2d | null = null;

  /**
   * 创建指定类型的节点（推荐使用此工厂方法而非直接 new）
   * @param type - 形状类型：'circle' | 'rect' | 'line' | 'path' | 'text' | 'image'
   * @param values - 视觉属性（fill/stroke/opacity/fontSize 等）
   */
  static create(type: string, values: AO = {}) {
    const shape = createShape(type);
    const attrs = new Attributes().from(values);
    const node = new Node(shape, attrs);
    node.shapeType = type;
    return node;
  }

  constructor(shape: Shape, attrs: Attributes) {
    super();
    this.shape = shape;
    this.attrs = attrs;
  }

  tick(time: number) {
    if (!this.display) return;
    this.shape.tick(time);
    this.attrs.tick(time);
    super.tick(time);
  }

  update() {
    super.update();
    this.shape.setAttrs(this.attrs.values);
    this.shape.build();
    this.attrs.setBox(this.shape.boundingBox);
    this.attrs.update();
    this.#invertWorldMatrix = null;
  }

  sign() {
    return super.sign() || this.shape.needUpdate || this.attrs.needUpdate;
  }

  /**
   * 计算节点在世界坐标系中的轴对齐包围盒 (AABB)。
   * 通过 worldMatrix 变换本地 boundingBox 的四个角点,
   * 返回变换后的包围盒。若本地包围盒不可用，返回 null。
   */
  getWorldBBox(): BoundingBox | null {
    const bb = this.shape.boundingBox;
    if (!bb || bb.empty) return null;

    const m = this.worldMatrix;
    const x0 = bb.x, y0 = bb.y, x1 = bb.right, y1 = bb.bottom;

    // 变换四角点，求世界空间 AABB
    let wx: number, wy: number;
    let minX: number, maxX: number, minY: number, maxY: number;

    wx = m[0] * x0 + m[2] * y0 + m[4];
    wy = m[1] * x0 + m[3] * y0 + m[5];
    minX = maxX = wx;
    minY = maxY = wy;

    wx = m[0] * x1 + m[2] * y0 + m[4];
    wy = m[1] * x1 + m[3] * y0 + m[5];
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy;
    if (wy > maxY) maxY = wy;

    wx = m[0] * x1 + m[2] * y1 + m[4];
    wy = m[1] * x1 + m[3] * y1 + m[5];
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy;
    if (wy > maxY) maxY = wy;

    wx = m[0] * x0 + m[2] * y1 + m[4];
    wy = m[1] * x0 + m[3] * y1 + m[5];
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy;
    if (wy > maxY) maxY = wy;

    return BoundingBox.fromPoints(minX, minY, maxX, maxY);
  }

  /**
   * 命中检测：将屏幕坐标通过逆世界矩阵变换为本地坐标，然后检测是否命中
   * @param point - 场景坐标 [x, y]
   * @returns 命中时返回自身，否则 undefined
   */
  hit(point: Point) {
    if (!this.display || !this.pointerEvents) return;
    if (!this.#invertWorldMatrix) this.#invertWorldMatrix = mat2d.invert(mat2d.create(), this.worldMatrix)!;
    const local = vec2.transformMat2d(vec2.create(), vec2.fromValues(...point), this.#invertWorldMatrix!) as Point;
    let flag = this.shape.hit(local);
    const {type, command} = this.shape;
    if (type === 0 && (command === 'path' || command === 'line')) {
      const {fill, stroke} = this.attrs.values;
      flag = isHit(this.shape.path2d(), local, fill, stroke, this.attrs.values);
    }
    return flag ? this : undefined;
  }
}
