import {isNumEq} from './math';

const i10 = Math.sqrt(50);
const i5 = Math.sqrt(10);
const i2 = Math.sqrt(2);

export const tickIncrement = (start: number, stop: number, count: number): number => {
  const i = (stop - start) / Math.max(1, Math.floor(count));
  const p = Math.floor(Math.log10(i));
  const err = i / Math.pow(10, p);
  const e = err >= i10 ? 10 : err >= i5 ? 5 : err >= i2 ? 2 : 1;
  if (p < 0) return -Math.pow(10, -p) / e;
  return e * Math.pow(10, p);
};

export const tickStep = (start: number, end: number, count: number): number => {
  const reverse = start > end;
  if (reverse) [start, end] = [end, start];
  const inc = tickIncrement(start, end, count);
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
};

export const nice = (start: number, stop: number, count: number): [number, number] => {
  let preInc;
  while (true) {
    const inc = tickIncrement(start, stop, count);
    if (inc === preInc || inc === 0 || !isFinite(inc)) {
      return [start, stop];
    } else if (inc > 0) {
      start = Math.floor(start / inc) * inc;
      stop = Math.ceil(stop / inc) * inc;
    } else if (inc < 0) {
      start = Math.ceil(start * inc) / inc;
      stop = Math.floor(stop * inc) / inc;
    }
    preInc = inc;
  }
};

export const niceForce = (start: number, stop: number, count: number): [number, number] => {
  while (true) {
    let inc = tickIncrement(start, stop, count);
    if (inc > 0) {
      start = Math.floor(start / inc) * inc;
      stop = Math.ceil(stop / inc) * inc;
    } else {
      start = Math.ceil(start * inc) / inc;
      stop = Math.floor(stop * inc) / inc;
      inc = 1 / -inc;
    }
    if (isNumEq(count, (stop - start) / inc, 1e-6)) {
      return [start, stop];
    } else {
      stop += inc;
    }
  }
};

export const tickSpec = (start: number, stop: number, count: number): [number, number, number] => {
  const inc = tickIncrement(start, stop, count);
  const spec: [number, number, number] = inc > 0 ? [Math.ceil(start / inc), Math.floor(stop / inc), inc] : [Math.ceil(start * -inc), Math.floor(stop * -inc), inc];
  if (spec[1] < spec[0]) return tickSpec(start, stop, count * 2);
  return spec;
};

export const ticks = (start: number, end: number, count: number): number[] => {
  if (count < 1) return [];
  if (start === end) return [start];
  const reverse = start > end;
  if (reverse) [start, end] = [end, start];
  const [a, b, inc] = tickSpec(start, end, count);
  const n = b - a + 1;
  const values = new Array(n);
  if (inc < 0) for (let i = 0; i < n; i += 1) values[i] = (a + i) / -inc;
  else for (let i = 0; i < n; i += 1) values[i] = (a + i) * inc;
  if (reverse) values.reverse();
  return values;
};
