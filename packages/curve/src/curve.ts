import type {Path} from '@dye/path';

/** 曲线函数签名 */
export type Curve = (path: Path, points: [number, number][], start?: boolean) => void;

// ── Linear ───────────────────────────────────────────

export const linear: Curve = (path, points, start = true) => {
  if (points.length <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) path.L(points[i][0], points[i][1]);
};

// ── Step ─────────────────────────────────────────────

export const step: Curve = (path, points, start = true) => {
  if (points.length <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const mx = (points[i - 1][0] + points[i][0]) / 2;
    path.L(mx, points[i - 1][1]);
    path.L(mx, points[i][1]);
    path.L(points[i][0], points[i][1]);
  }
};

export const stepBefore: Curve = (path, points, start = true) => {
  if (points.length <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    path.L(points[i - 1][0], points[i][1]);
    path.L(points[i][0], points[i][1]);
  }
};

export const stepAfter: Curve = (path, points, start = true) => {
  if (points.length <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    path.L(points[i][0], points[i - 1][1]);
    path.L(points[i][0], points[i][1]);
  }
};

// ── Bump ─────────────────────────────────────────────

export const bumpX: Curve = (path, points, start = true) => {
  if (points.length <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1][0] + points[i][0]) / 2;
    path.C(cpx, points[i - 1][1], cpx, points[i][1], points[i][0], points[i][1]);
  }
};

export const bumpY: Curve = (path, points, start = true) => {
  if (points.length <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const cpy = (points[i - 1][1] + points[i][1]) / 2;
    path.C(points[i - 1][0], cpy, points[i][0], cpy, points[i][0], points[i][1]);
  }
};

// ── Natural ──────────────────────────────────────────

const solveTridiagonal = (coords: number[]): [number[], number[]] => {
  const n = coords.length - 1;
  const a = new Array<number>(n);
  const b = new Array<number>(n);
  const r = new Array<number>(n);
  a[0] = 0;
  b[0] = 2;
  r[0] = coords[0] + 2 * coords[1];
  for (let i = 1; i < n - 1; i++) {
    a[i] = 1;
    b[i] = 4;
    r[i] = 4 * coords[i] + 2 * coords[i + 1];
  }
  a[n - 1] = 2;
  b[n - 1] = 7;
  r[n - 1] = 8 * coords[n - 1] + coords[n];
  // Forward sweep
  for (let i = 1; i < n; i++) {
    const m = a[i] / b[i - 1];
    b[i] -= m;
    r[i] -= m * r[i - 1];
  }
  // Back substitution
  a[n - 1] = r[n - 1] / b[n - 1];
  for (let i = n - 2; i >= 0; i--) a[i] = (r[i] - a[i + 1]) / b[i];
  b[n - 1] = (coords[n] + a[n - 1]) / 2;
  for (let i = 0; i < n - 1; i++) b[i] = 2 * coords[i + 1] - a[i + 1];
  return [a, b];
};

export const natural: Curve = (path, points, start = true) => {
  const len = points.length;
  if (len <= 1) return;
  // 提取坐标（避免 map 创建中间数组）
  const xs = new Array<number>(len);
  const ys = new Array<number>(len);
  for (let i = 0; i < len; i++) {
    xs[i] = points[i][0];
    ys[i] = points[i][1];
  }
  const [cx, bx] = solveTridiagonal(xs);
  const [cy, by] = solveTridiagonal(ys);
  if (start) path.M(points[0][0], points[0][1]);
  for (let i = 0; i < cx.length; i++) {
    path.C(cx[i], cy[i], bx[i], by[i], points[i + 1][0], points[i + 1][1]);
  }
};

// ── Monotone ─────────────────────────────────────────

const sign = (x: number) => (x < 0 ? -1 : 1);
const {min, abs} = Math;

const calcSlope = (h0: number, h1: number, s0: number, s1: number): number => {
  const p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * min(abs(s0), abs(s1), 0.5 * abs(p)) || 0;
};

const calcEndSlope = (h: number, dy: number, t: number): number => (h ? ((3 * dy) / h - t) / 2 : t);

export const monotoneX: Curve = (path, points, start = true) => {
  const n = points.length;
  if (n <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  if (n === 1) return;
  if (n === 2) {
    path.L(points[1][0], points[1][1]);
    return;
  }
  // 预计算所有斜率
  const slopes = new Array<number>(n);
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1][0] - points[i][0];
    const s = (points[i + 1][1] - points[i][1]) / (h || (i + 1 < n - 1 && points[i + 2][0] - points[i + 1][0] < 0 ? -0 : 1));
    if (i === 0) {
      slopes[0] = s; // 临时，后面修正
    }
    if (i > 0) {
      const h0 = points[i][0] - points[i - 1][0];
      const s0 = (points[i][1] - points[i - 1][1]) / (h0 || (h < 0 ? -0 : 1));
      slopes[i] = calcSlope(h0, h, s0, s);
    }
  }
  // 端点斜率
  const h0 = points[1][0] - points[0][0];
  slopes[0] = calcEndSlope(h0, points[1][1] - points[0][1], slopes[1]);
  const hN = points[n - 1][0] - points[n - 2][0];
  slopes[n - 1] = calcEndSlope(hN, points[n - 1][1] - points[n - 2][1], slopes[n - 2]);
  // 生成曲线
  for (let i = 0; i < n - 1; i++) {
    const dx = (points[i + 1][0] - points[i][0]) / 3;
    path.C(points[i][0] + dx, points[i][1] + dx * slopes[i], points[i + 1][0] - dx, points[i + 1][1] - dx * slopes[i + 1], points[i + 1][0], points[i + 1][1]);
  }
};

export const monotoneY: Curve = (path, points, start = true) => {
  // 交换 x/y 坐标，复用 monotoneX 逻辑
  const n = points.length;
  if (n <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  if (n === 1) return;
  if (n === 2) {
    path.L(points[1][0], points[1][1]);
    return;
  }
  // 翻转坐标计算斜率（以 y 为自变量）
  const slopes = new Array<number>(n);
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1][1] - points[i][1];
    const s = (points[i + 1][0] - points[i][0]) / (h || (i + 1 < n - 1 && points[i + 2][1] - points[i + 1][1] < 0 ? -0 : 1));
    if (i === 0) slopes[0] = s;
    if (i > 0) {
      const h0 = points[i][1] - points[i - 1][1];
      const s0 = (points[i][0] - points[i - 1][0]) / (h0 || (h < 0 ? -0 : 1));
      slopes[i] = calcSlope(h0, h, s0, s);
    }
  }
  const h0 = points[1][1] - points[0][1];
  slopes[0] = calcEndSlope(h0, points[1][0] - points[0][0], slopes[1]);
  const hN = points[n - 1][1] - points[n - 2][1];
  slopes[n - 1] = calcEndSlope(hN, points[n - 1][0] - points[n - 2][0], slopes[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    const dy = (points[i + 1][1] - points[i][1]) / 3;
    path.C(points[i][0] + dy * slopes[i], points[i][1] + dy, points[i + 1][0] - dy * slopes[i + 1], points[i + 1][1] - dy, points[i + 1][0], points[i + 1][1]);
  }
};

// ── Basis（B-样条） ─────────────────────────────────

export const basis: Curve = (path, points, start = true) => {
  const n = points.length;
  if (n <= 0) return;
  if (start) path.M(points[0][0], points[0][1]);
  if (n < 3) {
    for (let i = 1; i < n; i++) path.L(points[i][0], points[i][1]);
    return;
  }
  // 首段：起点到第一个控制段
  let x0 = points[0][0],
    y0 = points[0][1];
  let x1 = points[1][0],
    y1 = points[1][1];
  path.C((2 * x0 + x1) / 3, (2 * y0 + y1) / 3, (x0 + 2 * x1) / 3, (y0 + 2 * y1) / 3, (x0 + 4 * x1 + points[2][0]) / 6, (y0 + 4 * y1 + points[2][1]) / 6);
  // 中间段
  for (let i = 2; i < n - 1; i++) {
    x0 = points[i - 1][0];
    y0 = points[i - 1][1];
    x1 = points[i][0];
    y1 = points[i][1];
    const x2 = points[i + 1][0],
      y2 = points[i + 1][1];
    path.C((2 * x0 + x1) / 3, (2 * y0 + y1) / 3, (x0 + 2 * x1) / 3, (y0 + 2 * y1) / 3, (x0 + 4 * x1 + x2) / 6, (y0 + 4 * y1 + y2) / 6);
  }
  // 末段
  x0 = points[n - 2][0];
  y0 = points[n - 2][1];
  x1 = points[n - 1][0];
  y1 = points[n - 1][1];
  path.C((2 * x0 + x1) / 3, (2 * y0 + y1) / 3, (x0 + 2 * x1) / 3, (y0 + 2 * y1) / 3, x1, y1);
};

// ── Cardinal（张力曲线） ────────────────────────────

export const cardinal = (tension = 0): Curve => {
  const k = (1 - tension) / 6;
  return (path, points, start = true) => {
    const n = points.length;
    if (n <= 0) return;
    if (start) path.M(points[0][0], points[0][1]);
    if (n < 3) {
      for (let i = 1; i < n; i++) path.L(points[i][0], points[i][1]);
      return;
    }
    // 第一段用首点做虚拟前点
    let p0 = points[0],
      p1 = points[0],
      p2 = points[1],
      p3 = points[2];
    path.C(p1[0] + k * (p2[0] - p0[0]), p1[1] + k * (p2[1] - p0[1]), p2[0] - k * (p3[0] - p1[0]), p2[1] - k * (p3[1] - p1[1]), p2[0], p2[1]);
    for (let i = 2; i < n - 1; i++) {
      p0 = points[i - 2];
      p1 = points[i - 1];
      p2 = points[i];
      p3 = points[i + 1];
      path.C(p1[0] + k * (p2[0] - p0[0]), p1[1] + k * (p2[1] - p0[1]), p2[0] - k * (p3[0] - p1[0]), p2[1] - k * (p3[1] - p1[1]), p2[0], p2[1]);
    }
    // 末段用末点做虚拟后点
    p0 = points[n - 3];
    p1 = points[n - 2];
    p2 = points[n - 1];
    p3 = points[n - 1];
    path.C(p1[0] + k * (p2[0] - p0[0]), p1[1] + k * (p2[1] - p0[1]), p2[0] - k * (p3[0] - p1[0]), p2[1] - k * (p3[1] - p1[1]), p2[0], p2[1]);
  };
};

// ── Catmull-Rom ──────────────────────────────────────

export const catmullRom = (alpha = 0.5): Curve => {
  return (path, points, start = true) => {
    const n = points.length;
    if (n <= 0) return;
    if (start) path.M(points[0][0], points[0][1]);
    if (n < 3) {
      for (let i = 1; i < n; i++) path.L(points[i][0], points[i][1]);
      return;
    }
    for (let i = 1; i < n; i++) {
      const p0 = points[Math.max(0, i - 2)];
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[Math.min(n - 1, i + 1)];
      const d1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const d0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const d2 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
      const a1 = 2 * Math.pow(d0, 2 * alpha);
      const a2 = 2 * Math.pow(d1, 2 * alpha);
      const a3 = 2 * Math.pow(d2, 2 * alpha);
      const den1 = a1 + a2;
      const den2 = a2 + a3;
      const cp1x = den1 > 0 ? p1[0] + ((p2[0] - p0[0]) * a2) / den1 / 3 : p1[0];
      const cp1y = den1 > 0 ? p1[1] + ((p2[1] - p0[1]) * a2) / den1 / 3 : p1[1];
      const cp2x = den2 > 0 ? p2[0] - ((p3[0] - p1[0]) * a2) / den2 / 3 : p2[0];
      const cp2y = den2 > 0 ? p2[1] - ((p3[1] - p1[1]) * a2) / den2 / 3 : p2[1];
      path.C(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
    }
  };
};

// ── Registry ─────────────────────────────────────────

export const curveMap: Record<string, Curve> = {
  linear,
  natural,
  basis,
  'bump-x': bumpX,
  'bump-y': bumpY,
  'monotone-x': monotoneX,
  'monotone-y': monotoneY,
  step,
  'step-before': stepBefore,
  'step-after': stepAfter,
  cardinal: cardinal(),
  'catmull-rom': catmullRom(),
};
