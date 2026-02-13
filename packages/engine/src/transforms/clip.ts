import {easeMap} from '@dye/ease';
import {Path} from '@dye/path';

import {BaseTransform} from './base';

import type {BoundingBox} from '@dye/bounding';
import type {ClipPath} from '@dye/core';

/**
 * 裁剪框动画，特有 init/clear 状态管理 clipPath 生命周期
 * 覆盖基类 interpolate 实现自定义状态流
 */
export class ClipBoxTransform extends BaseTransform {
  type: 'lr' | 'rl' | 'tb' | 'bt' | undefined = undefined;
  boundingBox: BoundingBox | null = null;
  clipPath: ClipPath;
  #path: Path | null = null;

  constructor(clipPath: ClipPath) {
    super();
    this.clipPath = clipPath;
  }

  direction(type: 'lr' | 'rl' | 'tb' | 'bt') {
    this.type = type;
    return this;
  }

  box(box: BoundingBox) {
    this.boundingBox = box;
    this.status = 'start';
    this._time = -1;
    return this;
  }

  #generatePath(t: number) {
    if (!this.boundingBox) return;
    if (!this.#path) this.#path = new Path();
    else this.#path.clear();
    const {x, y, width, height} = this.boundingBox;
    const x0 = x,
      y0 = y,
      x1 = x + width,
      y1 = y + height;
    if (this.type === 'lr') {
      const px = x0 + (x1 - x0) * t;
      this.#path.M(px, y0);
      this.#path.L(px, y1);
      this.#path.L(x0, y1);
      this.#path.L(x0, y0);
      this.#path.Z();
    } else if (this.type === 'rl') {
      const px = x1 + (x0 - x1) * t;
      this.#path.M(px, y1);
      this.#path.L(px, y0);
      this.#path.L(x1, y0);
      this.#path.L(x1, y1);
      this.#path.Z();
    } else if (this.type === 'tb') {
      const py = y0 + (y1 - y0) * t;
      this.#path.M(x0, py);
      this.#path.L(x1, py);
      this.#path.L(x1, y0);
      this.#path.L(x0, y0);
      this.#path.Z();
    } else if (this.type === 'bt') {
      const py = y1 + (y0 - y1) * t;
      this.#path.M(x1, py);
      this.#path.L(x0, py);
      this.#path.L(x0, y1);
      this.#path.L(x1, y1);
      this.#path.Z();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected apply(_t: number) {}

  override interpolate(time: number) {
    if (this.status === 'end') return;

    if (this._time === -1) this._time = time;
    const elapsed = time - this._time;

    if (elapsed < this._delay) {
      if (this.status === 'init' || this.status === 'waiting') {
        this.status = 'waiting';
        return;
      }
      this.#generatePath(0);
      this.clipPath.path = this.#path!.toString();
      this.status = 'init';
      return;
    }
    if (elapsed - 16 > this._delay + this._duration) {
      if (this.status === 'running') this.status = 'clear';
      else if (this.status === 'clear') this.status = 'end';
      return;
    }
    this.status = 'running';
    const ease = easeMap[this._easing] ?? easeMap['linear'];
    const t = ease(Math.max(0, Math.min(1, (elapsed - this._delay) / this._duration)));
    this.#generatePath(t);
    this.clipPath.path = this.#path!.toString();
  }
}
