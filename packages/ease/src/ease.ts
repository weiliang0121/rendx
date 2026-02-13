/** 缓动函数类型 */
export type Ease = (t: number) => number;

const {pow, sqrt, sin, cos, PI} = Math;
const PI2 = PI / 2;

// ── Linear ───────────────────────────────────────────

export const linear: Ease = t => t;

// ── Poly（幂函数，quad/cubic/quart/quint 的泛化） ───

export const polyIn =
  (n = 3): Ease =>
  t =>
    pow(t, n);
export const polyOut =
  (n = 3): Ease =>
  t =>
    1 - pow(1 - t, n);
export const polyInOut = (n = 3): Ease => {
  const c = pow(2, n - 1);
  return t => (t < 0.5 ? c * pow(t, n) : 1 - pow(-2 * t + 2, n) / 2);
};

// ── Quad（n=2 特化，内联避免函数调用） ───────────────

export const quadIn: Ease = t => t * t;
export const quadOut: Ease = t => t * (2 - t);
export const quadInOut: Ease = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

// ── Cubic（n=3 特化） ───────────────────────────────

export const cubicIn: Ease = t => t * t * t;
export const cubicOut: Ease = t => --t * t * t + 1;
export const cubicInOut: Ease = t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

// ── Quart（n=4 特化） ───────────────────────────────

export const quartIn: Ease = t => t * t * t * t;
export const quartOut: Ease = t => 1 - --t * t * t * t;
export const quartInOut: Ease = t => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t);

// ── Quint（n=5 特化） ───────────────────────────────

export const quintIn: Ease = t => t * t * t * t * t;
export const quintOut: Ease = t => 1 + --t * t * t * t * t;
export const quintInOut: Ease = t => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t);

// ── Sine ─────────────────────────────────────────────

export const sineIn: Ease = t => 1 - cos(t * PI2);
export const sineOut: Ease = t => sin(t * PI2);
export const sineInOut: Ease = t => -(cos(PI * t) - 1) / 2;

// ── Exp（指数） ─────────────────────────────────────

export const expIn: Ease = t => (t === 0 ? 0 : pow(2, 10 * (t - 1)));
export const expOut: Ease = t => (t === 1 ? 1 : 1 - pow(2, -10 * t));
export const expInOut: Ease = t => {
  if (t === 0 || t === 1) return t;
  return t < 0.5 ? pow(2, 20 * t - 10) / 2 : (2 - pow(2, -20 * t + 10)) / 2;
};

// ── Circ（圆弧） ────────────────────────────────────

export const circIn: Ease = t => 1 - sqrt(1 - t * t);
export const circOut: Ease = t => sqrt(1 - --t * t);
export const circInOut: Ease = t => (t < 0.5 ? (1 - sqrt(1 - 4 * t * t)) / 2 : (sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2);

// ── Back ─────────────────────────────────────────────

const C1 = 1.70158;
const C2 = C1 + 1;
const C3 = C1 * 1.525;

export const backIn: Ease = t => C2 * t * t * t - C1 * t * t;
export const backOut: Ease = t => 1 + C2 * --t * t * t + C1 * t * t;
export const backInOut: Ease = t => (t < 0.5 ? (pow(2 * t, 2) * ((C3 + 1) * 2 * t - C3)) / 2 : (pow(2 * t - 2, 2) * ((C3 + 1) * (2 * t - 2) + C3) + 2) / 2);

// ── Elastic ──────────────────────────────────────────

const E1 = (2 * PI) / 3;
const E2 = (2 * PI) / 4.5;

export const elasticIn: Ease = t => {
  if (t === 0 || t === 1) return t;
  return -pow(2, 10 * t - 10) * sin((10 * t - 10.75) * E1);
};
export const elasticOut: Ease = t => {
  if (t === 0 || t === 1) return t;
  return pow(2, -10 * t) * sin((10 * t - 0.75) * E1) + 1;
};
export const elasticInOut: Ease = t => {
  if (t === 0 || t === 1) return t;
  return t < 0.5 ? -(pow(2, 20 * t - 10) * sin((20 * t - 11.125) * E2)) / 2 : (pow(2, -20 * t + 10) * sin((20 * t - 11.125) * E2)) / 2 + 1;
};

// ── Bounce ───────────────────────────────────────────

const N = 7.5625;
const D = 2.75;

export const bounceOut: Ease = t => {
  if (t < 1 / D) return N * t * t;
  if (t < 2 / D) return N * (t -= 1.5 / D) * t + 0.75;
  if (t < 2.5 / D) return N * (t -= 2.25 / D) * t + 0.9375;
  return N * (t -= 2.625 / D) * t + 0.984375;
};
export const bounceIn: Ease = t => 1 - bounceOut(1 - t);
export const bounceInOut: Ease = t => (t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2);

// ── Registry ─────────────────────────────────────────

export const easeMap: Record<string, Ease> = {
  linear,
  inQuad: quadIn,
  outQuad: quadOut,
  inOutQuad: quadInOut,
  inCubic: cubicIn,
  outCubic: cubicOut,
  inOutCubic: cubicInOut,
  inQuart: quartIn,
  outQuart: quartOut,
  inOutQuart: quartInOut,
  inQuint: quintIn,
  outQuint: quintOut,
  inOutQuint: quintInOut,
  inSine: sineIn,
  outSine: sineOut,
  inOutSine: sineInOut,
  inExp: expIn,
  outExp: expOut,
  inOutExp: expInOut,
  inCirc: circIn,
  outCirc: circOut,
  inOutCirc: circInOut,
  inBack: backIn,
  outBack: backOut,
  inOutBack: backInOut,
  inElastic: elasticIn,
  outElastic: elasticOut,
  inOutElastic: elasticInOut,
  inBounce: bounceIn,
  outBounce: bounceOut,
  inOutBounce: bounceInOut,
};

/** 按名称查找缓动函数，未找到时返回 linear */
export const ease = (name: string): Ease => easeMap[name] ?? linear;
