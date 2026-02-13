import {mat2d, vec2} from 'gl-matrix';

import {Graphics, Shape, Attributes} from '../core';
import {createShape} from '../shapes';

import {isHit} from '../core/canvas-hit';

import type {AO, Point} from '@dye/core';

export class Node extends Graphics {
  type: number = 3;

  shape: Shape;
  attrs: Attributes;

  #invertWorldMatrix: mat2d | null = null;

  static create(type: string, values: AO = {}) {
    const shape = createShape(type);
    const attrs = new Attributes().from(values);
    return new Node(shape, attrs);
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
    this.shape.build();
    this.attrs.setBox(this.shape.boundingBox);
    this.attrs.update();
    this.#invertWorldMatrix = null;
  }

  sign() {
    return super.sign() || this.shape.needUpdate || this.attrs.needUpdate;
  }

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
