import {interpolateColor} from '@dye/interpolate';

import {BaseTransform} from './base';

import type {AO} from '@dye/core';

interface TransformAttrs {
  opacity?: [number, number];
  fill?: [string, string];
  fillOpacity?: [number, number];
  stroke?: [string, string];
  strokeOpacity?: [number, number];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class AttributeTransform extends BaseTransform {
  V: AO;
  attrs: TransformAttrs = {};

  constructor(values: AO) {
    super();
    this.V = values;
  }

  /** 设置属性动画目标值（属性应在调用前已设置初始值） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attr(key: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.attrs[key as any] = [this.V[key] ?? value, value];
    this.status = 'start';
    this._time = -1;
    return this;
  }

  protected apply(t: number) {
    const {opacity, fill, fillOpacity, stroke, strokeOpacity} = this.attrs;
    if (opacity) this.V.opacity = opacity[0] + (opacity[1] - opacity[0]) * t;
    if (fill) this.V.fill = interpolateColor(fill[0], fill[1])(t);
    if (fillOpacity) this.V.fillOpacity = fillOpacity[0] + (fillOpacity[1] - fillOpacity[0]) * t;
    if (stroke) this.V.stroke = interpolateColor(stroke[0], stroke[1])(t);
    if (strokeOpacity) this.V.strokeOpacity = strokeOpacity[0] + (strokeOpacity[1] - strokeOpacity[0]) * t;
  }
}
