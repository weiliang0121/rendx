export const toNum = (v: unknown): number => Number(v);
export const numDelta = (a: unknown, b: unknown): number => Number(a) - Number(b);

export const financial = (x: number, p?: number) => {
  if (!Number.isFinite(x)) return x;
  if (p == null) return x;
  const precision = Math.min(100, Math.max(0, Math.floor(p)));
  return Number.parseFloat(x.toFixed(precision));
};

export const financialFormat = (x: number, p?: number) => {
  if (!Number.isFinite(x)) return `${x}`;
  if (p == null) return `${x}`;
  const precision = Math.min(100, Math.max(0, Math.floor(p)));
  return x.toFixed(precision);
};
