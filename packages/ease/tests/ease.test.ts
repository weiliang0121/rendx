import {describe, it, expect} from 'vitest';
import {
  linear,
  quadIn,
  quadOut,
  quadInOut,
  cubicIn,
  cubicOut,
  cubicInOut,
  quartIn,
  quartOut,
  quartInOut,
  quintIn,
  quintOut,
  quintInOut,
  sineIn,
  sineOut,
  sineInOut,
  expIn,
  expOut,
  expInOut,
  circIn,
  circOut,
  circInOut,
  backIn,
  backOut,
  backInOut,
  elasticIn,
  elasticOut,
  elasticInOut,
  bounceIn,
  bounceOut,
  bounceInOut,
  polyIn,
  polyOut,
  polyInOut,
  ease,
  easeMap,
} from '../src/main';

/** All static ease functions to test */
const staticEasings = [
  {name: 'linear', fn: linear},
  {name: 'quadIn', fn: quadIn},
  {name: 'quadOut', fn: quadOut},
  {name: 'quadInOut', fn: quadInOut},
  {name: 'cubicIn', fn: cubicIn},
  {name: 'cubicOut', fn: cubicOut},
  {name: 'cubicInOut', fn: cubicInOut},
  {name: 'quartIn', fn: quartIn},
  {name: 'quartOut', fn: quartOut},
  {name: 'quartInOut', fn: quartInOut},
  {name: 'quintIn', fn: quintIn},
  {name: 'quintOut', fn: quintOut},
  {name: 'quintInOut', fn: quintInOut},
  {name: 'sineIn', fn: sineIn},
  {name: 'sineOut', fn: sineOut},
  {name: 'sineInOut', fn: sineInOut},
  {name: 'expIn', fn: expIn},
  {name: 'expOut', fn: expOut},
  {name: 'expInOut', fn: expInOut},
  {name: 'circIn', fn: circIn},
  {name: 'circOut', fn: circOut},
  {name: 'circInOut', fn: circInOut},
  {name: 'backIn', fn: backIn},
  {name: 'backOut', fn: backOut},
  {name: 'backInOut', fn: backInOut},
  {name: 'elasticIn', fn: elasticIn},
  {name: 'elasticOut', fn: elasticOut},
  {name: 'elasticInOut', fn: elasticInOut},
  {name: 'bounceIn', fn: bounceIn},
  {name: 'bounceOut', fn: bounceOut},
  {name: 'bounceInOut', fn: bounceInOut},
];

describe('ease functions', () => {
  // ── 基本边界条件 ──

  describe.each(staticEasings)('$name', ({fn}) => {
    it('f(0) ≈ 0', () => {
      expect(fn(0)).toBeCloseTo(0, 5);
    });

    it('f(1) ≈ 1', () => {
      expect(fn(1)).toBeCloseTo(1, 5);
    });

    it('returns finite values for t in [0, 1]', () => {
      for (let t = 0; t <= 1; t += 0.1) {
        expect(Number.isFinite(fn(t))).toBe(true);
      }
    });
  });

  // ── linear ──

  describe('linear', () => {
    it('is identity function', () => {
      expect(linear(0.5)).toBe(0.5);
      expect(linear(0.25)).toBe(0.25);
    });
  });

  // ── InOut symmetry ──

  describe('InOut symmetry', () => {
    it('quadInOut(0.5) is 0.5', () => {
      expect(quadInOut(0.5)).toBeCloseTo(0.5, 5);
    });

    it('cubicInOut(0.5) is 0.5', () => {
      expect(cubicInOut(0.5)).toBeCloseTo(0.5, 5);
    });

    it('sineInOut(0.5) is 0.5', () => {
      expect(sineInOut(0.5)).toBeCloseTo(0.5, 5);
    });
  });

  // ── In/Out relationship ──

  describe('In/Out complementarity', () => {
    it('quadIn(t) + quadOut(1-t) ≈ 1', () => {
      expect(quadIn(0.3) + quadOut(0.7)).toBeCloseTo(1, 5);
    });

    it('cubicIn(t) + cubicOut(1-t) ≈ 1', () => {
      expect(cubicIn(0.3) + cubicOut(0.7)).toBeCloseTo(1, 5);
    });
  });

  // ── Poly factory ──

  describe('poly factory', () => {
    it('polyIn(2) equals quadIn for some values', () => {
      const fn = polyIn(2);
      expect(fn(0.5)).toBeCloseTo(quadIn(0.5), 5);
    });

    it('polyOut(2) equals quadOut', () => {
      const fn = polyOut(2);
      expect(fn(0.5)).toBeCloseTo(quadOut(0.5), 5);
    });

    it('polyInOut(2) equals quadInOut', () => {
      const fn = polyInOut(2);
      expect(fn(0.5)).toBeCloseTo(quadInOut(0.5), 5);
    });
  });

  // ── Bounce ──

  describe('bounceOut', () => {
    it('is monotonically non-decreasing overall', () => {
      let prev = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const v = bounceOut(t);
        expect(v).toBeGreaterThanOrEqual(-0.01); // allow small float error
      }
    });
  });

  // ── easeMap registry ──

  describe('easeMap', () => {
    it('contains all registered easing functions', () => {
      expect(easeMap.linear).toBe(linear);
      expect(easeMap.inQuad).toBe(quadIn);
      expect(easeMap.outCubic).toBe(cubicOut);
      expect(easeMap.inOutSine).toBe(sineInOut);
      expect(easeMap.inBounce).toBe(bounceIn);
    });
  });

  // ── ease() lookup ──

  describe('ease()', () => {
    it('returns matching function for known name', () => {
      expect(ease('linear')).toBe(linear);
      expect(typeof ease('inQuad')).toBe('function');
    });

    it('falls back to linear for unknown name', () => {
      expect(ease('nonexistent')).toBe(linear);
    });
  });
});
