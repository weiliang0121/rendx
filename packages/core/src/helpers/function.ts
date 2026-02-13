import type {GF} from '../types';

export const uid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const uid8 = (): string => uid().slice(0, 8);

export const identity = <T>(x: T): T => x;

export const compose = (...fns: GF[]): GF => {
  return x => fns.reduce((v, f) => f(v), x);
};

export const debounce = (fn: GF, delay: number): GF => {
  let timer: number;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
    return timer;
  };
};

export const throttle = (fn: GF, delay: number): GF => {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args) => {
    const now = performance.now();

    if (now - last < delay) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(
        () => {
          last = now;
          fn(...args);
        },
        delay - (now - last),
      );
    } else {
      last = now;
      fn(...args);
    }
    return timer;
  };
};
