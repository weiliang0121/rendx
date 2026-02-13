import {BaseTransform} from '../base';

interface SectorTransformValues {
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
}

export class SectorTransform extends BaseTransform {
  V: SectorTransformValues;
  attrs: Partial<Record<keyof SectorTransformValues, [number, number]>> = {};
  values: Partial<SectorTransformValues> = {};

  constructor(values: SectorTransformValues) {
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

  innerRadius(r: number) {
    if (!this.attrs.innerRadius) {
      this.attrs.innerRadius = [this.V.innerRadius, r];
    } else {
      this.attrs.innerRadius = [this.attrs.innerRadius[0], r];
    }
    this.status = 'start';
    this._time = -1;
    return this;
  }

  outerRadius(r: number) {
    if (!this.attrs.outerRadius) {
      this.attrs.outerRadius = [this.V.outerRadius, r];
    } else {
      this.attrs.outerRadius = [this.attrs.outerRadius[0], r];
    }
    this.status = 'start';
    this._time = -1;
    return this;
  }

  protected apply(t: number) {
    const {startAngle, endAngle, innerRadius, outerRadius} = this.attrs;
    if (startAngle) this.values.startAngle = startAngle[0] + (startAngle[1] - startAngle[0]) * t;
    if (endAngle) this.values.endAngle = endAngle[0] + (endAngle[1] - endAngle[0]) * t;
    if (innerRadius) this.values.innerRadius = innerRadius[0] + (innerRadius[1] - innerRadius[0]) * t;
    if (outerRadius) this.values.outerRadius = outerRadius[0] + (outerRadius[1] - outerRadius[0]) * t;
  }

  protected onEnd() {
    this.attrs = {};
  }
}
