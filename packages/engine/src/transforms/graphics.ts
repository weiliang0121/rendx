import {BaseTransform} from './base';

interface TransformAttrs {
  translate?: [number, number, number, number];
  rotate?: [number, number];
  scale?: [number, number, number, number];
}

interface TransformValues {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  rotate: number;
}

export class GraphicsTransform extends BaseTransform {
  V: TransformValues;
  attrs: TransformAttrs = {};
  values: Partial<TransformValues> = {};

  constructor(values: TransformValues) {
    super();
    this.V = values;
  }

  translate(x: number, y: number) {
    if (!this.attrs.translate) {
      this.attrs.translate = [this.V.tx, this.V.ty, x, y];
    } else {
      const [, , tx2, ty2] = this.attrs.translate;
      this.attrs.translate = [tx2, ty2, x, y];
    }
    this.status = 'start';
    this._time = -1;
    return this;
  }

  rotate(r: number) {
    if (!this.attrs.rotate) {
      this.attrs.rotate = [this.V.rotate, r];
    } else {
      const [, r2] = this.attrs.rotate;
      this.attrs.rotate = [r2, r];
    }
    this.status = 'start';
    this._time = -1;
    return this;
  }

  scale(x: number, y: number) {
    if (!this.attrs.scale) {
      this.attrs.scale = [this.V.sx, this.V.sy, x, y];
    } else {
      const [, , sx2, sy2] = this.attrs.scale;
      this.attrs.scale = [sx2, sy2, x, y];
    }
    this.status = 'start';
    this._time = -1;
    return this;
  }

  protected apply(t: number) {
    const {translate, scale, rotate} = this.attrs;
    if (translate) {
      this.values.tx = translate[0] + (translate[2] - translate[0]) * t;
      this.values.ty = translate[1] + (translate[3] - translate[1]) * t;
    }
    if (scale) {
      this.values.sx = scale[0] + (scale[2] - scale[0]) * t;
      this.values.sy = scale[1] + (scale[3] - scale[1]) * t;
    }
    if (rotate) {
      this.values.rotate = rotate[0] + (rotate[1] - rotate[0]) * t;
    }
  }

  protected onEnd() {
    this.attrs = {};
  }
}
