const swap = (arr: number[], i: number, j: number): void => {
  [arr[i], arr[j]] = [arr[j], arr[i]];
};

const partition = (arr: number[], l: number, r: number): number => {
  const pivot = arr[r];
  let i = l - 1;
  for (let j = l; j < r; ++j) if (arr[j] < pivot) swap(arr, ++i, j);
  swap(arr, i + 1, r);
  return i + 1;
};

export const quickSort = (arr: number[]): number[] => {
  const sort = (l: number, r: number) => {
    if (l >= r) return;
    const p = partition(arr, l, r);
    sort(l, p - 1);
    sort(p + 1, r);
  };
  if (arr.length > 1) sort(0, arr.length - 1);
  return arr;
};
