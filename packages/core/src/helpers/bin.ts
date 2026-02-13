import {ascending, extent} from './array';
import {nice, tickIncrement, ticks} from './ticks';
import {isArr, isNum, isUndef} from '../guards';
import {Bisector} from './bisector';
import {identity} from './function';

import type {GF} from '../types';

/** 分箱结果项：一个数组附带 x0/x1/total 元数据 */
export interface BinItem<T = unknown> extends Array<T> {
  x0: number;
  x1: number;
  total: number;
}

const sturgesRule = (V: unknown[]) => Math.max(1, Math.ceil(Math.log2(V.length) + 1));

export class Bin {
  value: GF = identity;
  domain?: [number, number];
  thresholds: number | number[] | GF = sturgesRule;

  setValue(value: GF) {
    this.value = value;
    return this;
  }

  setDomain(domain: [number, number]) {
    this.domain = domain;
    return this;
  }

  setThresholds(thresholds: number | number[] | GF) {
    this.thresholds = thresholds;
    return this;
  }

  bin<T>(data: T[]): BinItem<T>[] {
    if (!Array.isArray(data) || !data.length) return [];
    const V = data.map(this.value);
    let [x0, x1] = this.domain ?? extent(V);
    const max = x1;
    let step = Infinity;
    let T: number[] = [];
    if (!isArr(this.thresholds)) {
      const n = isNum(this.thresholds) ? this.thresholds : this.thresholds(V);
      if (isUndef(this.domain)) [x0, x1] = nice(x0, x1, n);
      T = ticks(x0, x1, n);
      if (T[0] <= x0) step = tickIncrement(x0, x1, n);
      if (T[T.length - 1] >= x1) {
        if (max >= x1 && isUndef(this.domain)) {
          const step = tickIncrement(x0, x1, n);
          if (isFinite(step)) {
            if (step > 0) x1 = (Math.floor(x1 / step) + 1) * step;
            else if (step < 0) x1 = (Math.ceil(x1 * -step) + 1) / -step;
          }
        } else {
          T.pop();
        }
      }
    } else {
      T = this.thresholds;
    }
    T = T.filter(t => t >= x0 && t <= x1);
    const bins = Array.from({length: T.length + 1}, (_, i) => {
      const bin = [] as unknown as BinItem<T>;
      bin.x0 = i > 0 ? T[i - 1] : x0;
      bin.x1 = i < T.length ? T[i] : x1;
      bin.total = V.length;
      return bin;
    });

    let v = 0;
    if (isFinite(step)) {
      if (step > 0) {
        for (let i = 0; i < V.length; i += 1) {
          v = V[i];
          if (x0 <= v && v <= x1) bins[Math.min(T.length, Math.floor((v - x0) / step))].push(data[i]);
        }
      } else if (step < 0) {
        let j = 0;
        for (let i = 0; i < V.length; i += 1) {
          v = V[i];
          if (x0 <= v && v <= x1) {
            j = Math.floor((v - x0) * -step);
            bins[Math.min(T.length, j + +(T[j] <= v))].push(data[i]);
          }
        }
      }
    } else {
      const bisector = new Bisector().setField(identity).setOrder(ascending);
      for (let i = 0; i < V.length; i += 1) {
        v = V[i];
        if (x0 <= v && v <= x1) bins[bisector.right(T, v)].push(data[i]);
      }
    }
    return bins;
  }
}
