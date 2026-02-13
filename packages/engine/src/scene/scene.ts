import {mat2d, vec2} from 'gl-matrix';

import {Graphics} from '../core/graphics';

import type {Mat2d, Point} from '@dye/core';

import type {Node} from './node';

export class Scene extends Graphics {
  type: number = 1;
  #queue: Node[] = [];
  #invertWorldMatrix: mat2d | null = null;

  getQueue(): Node[] {
    if (this.dirty) {
      const queue: Node[] = [];
      this.traverse((node: Graphics) => {
        if (node.type === 3) queue.push(node as Node);
      });
      queue.sort((a, b) => a.ez - b.ez);
      this.setDirty(false);
      this.#queue = queue;
    }
    return this.#queue;
  }

  pick(point: Point): Node | undefined {
    for (let i = this.#queue.length - 1; i >= 0; i--) {
      const node = this.#queue[i];
      if (node.hit(point)) return node;
    }
    return undefined;
  }

  position(point: Point): Point {
    if (!this.#invertWorldMatrix) this.#invertWorldMatrix = mat2d.invert(mat2d.create(), this.worldMatrix)!;
    return vec2.transformMat2d(vec2.create(), point, this.#invertWorldMatrix) as Point;
  }

  override setMatrix(matrix: Mat2d, needUpdate?: boolean) {
    this.#invertWorldMatrix = null;
    return super.setMatrix(matrix, needUpdate);
  }
}
