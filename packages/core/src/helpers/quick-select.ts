// based on https://github.com/mourner/quickselect
// https://zh.wikipedia.org/wiki/%E5%BF%AB%E9%80%9F%E9%80%89%E6%8B%A9

import {ascending} from './array';

const swap = <T>(arr: T[], i: number, j: number) => {
  const t = arr[i];
  arr[i] = arr[j];
  arr[j] = t;
};

export const quickselect = <T>(arr: T[], k: number, l = 0, r = Infinity, compare: (a: T, b: T) => number = ascending): T[] => {
  k = Math.floor(k);
  l = Math.floor(Math.max(0, l));
  r = Math.floor(Math.min(arr.length - 1, r));
  if (!(l <= k && k <= r)) return arr;
  while (r > l) {
    if (r - l > 600) {
      const n = r - l + 1;
      const m = k - l + 1;
      const z = Math.log(n);
      const s = 0.5 * Math.exp((2 * z) / 3);
      const sd = 0.5 * Math.sqrt((z * s * (n - s)) / n) * Math.sign(m - n / 2);
      const newL = Math.max(l, Math.floor(k - (m * s) / n + sd));
      const newR = Math.min(r, Math.floor(k + ((n - m) * s) / n + sd));
      quickselect(arr, k, newL, newR, compare);
    }
    const t = arr[k];
    let i = l;
    let j = r;
    swap(arr, l, k);
    if (compare(arr[r], t) > 0) swap(arr, l, r);
    while (i < j) {
      swap(arr, i, j);
      i++;
      j--;
      while (compare(arr[i], t) < 0) i++;
      while (compare(arr[j], t) > 0) j--;
    }
    if (compare(arr[l], t) === 0) swap(arr, l, j);
    else {
      j++;
      swap(arr, j, r);
    }
    if (j <= k) l = j + 1;
    if (k <= j) r = j - 1;
  }
  return arr;
};
