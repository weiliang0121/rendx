import {BaseTransform} from '../base';

interface ArcTransformValues {
  startAngle: number;
  endAngle: number;
}

export class ArcTransform extends BaseTransform {
  V: ArcTransformValues;
  attrs: Partial<Record<keyof ArcTransformValues, [number, number]>> = {};
  values: Partial<ArcTransformValues> = {};

  constructor(values: ArcTransformValues) {
    super();
    this.V = values;
  }

  startAngle(a: number) {
    if (!this.attrs.startAngle) {
      this.attrs.startAngle = [this.V.startAngle, a];
    } else {
      this.attrs.startAngle = [this.attrs.startAngle[0], a];
    }
    this.status = 'start';
    this._time = -1;
    return this;
  }

  endAngle(a: number) {
    if (!this.attrs.endAngle) {
      this.attrs.endAngle = [this.V.endAngle, a];
    } else {
      this.attrs.endAngle = [this.attrs.endAngle[0], a];
    }
    this.status = 'start';
    this._time = -1;
    return this;
  }

  protected apply(t: number) {
    const {startAngle, endAngle} = this.attrs;
    if (startAngle) this.values.startAngle = startAngle[0] + (startAngle[1] - startAngle[0]) * t;
    if (endAngle) this.values.endAngle = endAngle[0] + (endAngle[1] - endAngle[0]) * t;
  }

  protected onEnd() {
    this.attrs = {};
  }
}
