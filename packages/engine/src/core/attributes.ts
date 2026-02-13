import {uid8, isNil} from '@dye/core';

import {AttributeTransform, ClipBoxTransform} from '../transforms';

import type {BoundingBox} from '@dye/bounding';
import type {ClipPath, GradientOptions, AO} from '@dye/core';

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

  from(attrs: AO) {
    this.values = attrs;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  merge(attrs: AO) {
    Object.entries(attrs ?? {}).forEach(([key, value]) => (this.values[key] = value));
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  gradient(gradientOptions: GradientOptions) {
    this.gradientOptions = gradientOptions;
    if (isNil(this.gradientOptions.id)) this.gradientOptions.id = this.uid;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  clip(clipPath: ClipPath) {
    this.clipPath = clipPath;
    if (isNil(this.clipPath.id)) this.clipPath.id = this.uid;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  setBox(box: BoundingBox) {
    this.#boundingBox = box;
    return this;
  }

  useTransform() {
    if (this.transform) return this;
    this.transform = new AttributeTransform(this.values);
    return this;
  }

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
