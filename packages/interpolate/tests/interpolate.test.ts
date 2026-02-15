import {describe, it, expect} from 'vitest';
import {lerp, normalize, interpolateColor, interpolateColors, interpolateValue} from '../src/main';

describe('lerp', () => {
  it('returns start at t=0', () => {
    const fn = lerp(10, 20);
    expect(fn(0)).toBe(10);
  });

  it('returns end at t=1', () => {
    const fn = lerp(10, 20);
    expect(fn(1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    const fn = lerp(0, 100);
    expect(fn(0.5)).toBe(50);
  });

  it('works with negative values', () => {
    const fn = lerp(-10, 10);
    expect(fn(0.5)).toBe(0);
  });
});

describe('normalize', () => {
  it('maps value to [0, 1] range', () => {
    const fn = normalize(0, 100);
    expect(fn(0)).toBe(0);
    expect(fn(50)).toBe(0.5);
    expect(fn(100)).toBe(1);
  });

  it('handles equal bounds', () => {
    const fn = normalize(5, 5);
    expect(fn(5)).toBe(0.5);
  });

  it('returns NaN for NaN bounds', () => {
    const fn = normalize(NaN, NaN);
    expect(fn(5)).toBeNaN();
  });
});

describe('interpolateColor', () => {
  it('returns start color at t=0', () => {
    const fn = interpolateColor('#000000', '#ffffff');
    expect(fn(0)).toBe('#000000');
  });

  it('returns end color at t=1', () => {
    const fn = interpolateColor('#000000', '#ffffff');
    expect(fn(1)).toBe('#ffffff');
  });

  it('returns midpoint color at t=0.5', () => {
    const fn = interpolateColor('#000000', '#ffffff');
    const mid = fn(0.5);
    // Should be approximately #808080 (gray)
    expect(mid).toMatch(/^#[0-9a-f]{6}$/);
    expect(mid).toBe('#808080');
  });

  it('handles rgb() format input', () => {
    const fn = interpolateColor('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
    expect(fn(0)).toBe('#000000');
    expect(fn(1)).toBe('#ffffff');
  });

  it('throws for unsupported format', () => {
    expect(() => interpolateColor('red', 'blue')).toThrow('Unsupported color format');
  });
});

describe('interpolateColors', () => {
  it('interpolates through multiple colors', () => {
    const fn = interpolateColors(['#000000', '#ffffff', '#000000']);
    expect(fn(0)).toBe('#000000');
    expect(fn(0.5)).toBe('#ffffff');
    expect(fn(1)).toBe('#000000');
  });

  it('caches interpolators for same color arrays', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    const fn1 = interpolateColors(colors);
    const fn2 = interpolateColors(colors);
    // Both should produce identical results
    expect(fn1(0.3)).toBe(fn2(0.3));
  });
});

describe('interpolateValue', () => {
  it('dispatches to lerp for numbers', () => {
    const fn = interpolateValue(0, 100);
    expect(fn(0.5)).toBe(50);
  });

  it('dispatches to interpolateColor for strings', () => {
    const fn = interpolateValue('#000000', '#ffffff');
    expect(fn(0.5)).toBe('#808080');
  });

  it('returns constant for mismatched types', () => {
    const fn = interpolateValue(42 as any, '#fff' as any);
    expect(fn(0.5)).toBe(42);
  });
});
