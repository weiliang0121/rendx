import {uid8, isNil} from 'rendx-core';

import {AttributeTransform, ClipBoxTransform} from '../transforms';

import type {BoundingBox} from 'rendx-bounding';
import type {ClipPath, GradientOptions, AO} from 'rendx-core';

/**
 * 视觉属性容器，管理 fill/stroke/opacity/fontSize 等渲染属性。
 * 支持属性动画（AttributeTransform）和裁剪动画（ClipBoxTransform）。
 */
export class Attributes {
  uid: string = uid8();

  name: string = '';
  values: AO = {};
  gradientOptions: GradientOptions | undefined;
  clipPath: ClipPath | undefined;
  autoNeedUpdate: boolean = true;
  needUpdate: boolean = true;

  transform: AttributeTransform | null = null;
  clipBoxTransform: ClipBoxTransform | null = null;

  #boundingBox: BoundingBox | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(key: string, value: any) {
    this.values[key] = value;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  get(key: string) {
    return this.values[key];
  }

  /** 从对象批量设置属性（替换全部） */
  from(attrs: AO) {
    this.values = attrs;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  /** 合并属性（保留已有值，追加新值） */
  merge(attrs: AO) {
    Object.entries(attrs ?? {}).forEach(([key, value]) => (this.values[key] = value));
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  /** 关联渐变配置 */
  gradient(gradientOptions: GradientOptions) {
    this.gradientOptions = gradientOptions;
    if (isNil(this.gradientOptions.id)) this.gradientOptions.id = this.uid;
    this.values.fill = `url(#${this.gradientOptions.id})`;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  /** 关联裁剪路径 */
  clip(clipPath: ClipPath) {
    this.clipPath = clipPath;
    if (isNil(this.clipPath.id)) this.clipPath.id = this.uid;
    this.values.clipPath = `url(#${this.clipPath.id})`;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  setBox(box: BoundingBox) {
    this.#boundingBox = box;
    return this;
  }

  /** 启用属性动画（可对 opacity/fill/stroke 等做插值动画） */
  useTransform() {
    if (this.transform) return this;
    this.transform = new AttributeTransform(this.values);
    return this;
  }

  /** 启用裁剪框动画（lr/rl/tb/bt 方向的揭露动效） */
  useClipBoxTransform() {
    if (this.clipBoxTransform) return this;
    this.clip({id: this.uid, path: ''});
    this.set('clipPath', `url(#${this.uid})`);
    this.clipBoxTransform = new ClipBoxTransform(this.clipPath!);
    return this;
  }

  tick(time: number) {
    if (this.transform) {
      this.transform.interpolate(time);
      if (this.transform.status === 'running' || this.transform.status === 'last') this.needUpdate = true;
    }

    if (this.clipBoxTransform) {
      this.clipBoxTransform.interpolate(time);
      const {status} = this.clipBoxTransform;
      if (status === 'init' || status === 'running') this.needUpdate = true;
      if (status === 'clear') {
        this.clipPath = undefined;
        delete this.values.clipPath;
        this.needUpdate = true;
      }
    }

    return this;
  }

  #updateBoundingBoxForGradient() {
    if (!this.#boundingBox) return;
    if (!this.gradientOptions) return;
    if (this.gradientOptions.region) return;
    const {x, y, width, height} = this.#boundingBox;
    this.gradientOptions.region = [x, y, width, height];
  }

  update() {
    if (!this.needUpdate) return;
    this.#updateBoundingBoxForGradient();
    this.needUpdate = false;
  }

  clear() {
    this.values = {};
    this.gradientOptions = undefined;
    this.clipPath = undefined;
    return this;
  }

  dispose() {
    this.clear();
  }
}
