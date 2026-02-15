import {describe, it, expect} from 'vitest';
import {Path} from '../src/main';

describe('Path', () => {
  it('starts empty', () => {
    const p = new Path();
    expect(p.toString()).toBe('');
  });

  // ── 绝对坐标命令 ──

  describe('absolute commands', () => {
    it('M - moveTo', () => {
      const p = new Path();
      p.M(10, 20);
      expect(p.toString()).toBe('M10 20 ');
    });

    it('L - lineTo', () => {
      const p = new Path();
      p.M(0, 0).L(100, 200);
      expect(p.toString()).toBe('M0 0 L100 200 ');
    });

    it('H - horizontal line', () => {
      const p = new Path();
      p.H(50);
      expect(p.toString()).toBe('H50 ');
    });

    it('V - vertical line', () => {
      const p = new Path();
      p.V(50);
      expect(p.toString()).toBe('V50 ');
    });

    it('C - cubic bezier', () => {
      const p = new Path();
      p.C(10, 20, 30, 40, 50, 60);
      expect(p.toString()).toBe('C10 20 30 40 50 60 ');
    });

    it('Q - quadratic bezier', () => {
      const p = new Path();
      p.Q(10, 20, 30, 40);
      expect(p.toString()).toBe('Q10 20 30 40 ');
    });

    it('A - arc', () => {
      const p = new Path();
      p.A(25, 25, 0, 1, 0, 50, 0);
      expect(p.toString()).toBe('A25 25 0 1 0 50 0 ');
    });

    it('Z - close path', () => {
      const p = new Path();
      p.M(0, 0).L(100, 0).L(100, 100).Z();
      expect(p.toString()).toBe('M0 0 L100 0 L100 100 Z ');
    });
  });

  // ── 相对坐标命令 ──

  describe('relative commands', () => {
    it('l - relative lineTo', () => {
      const p = new Path();
      p.l(10, 20);
      expect(p.toString()).toBe('l10 20 ');
    });

    it('h - relative horizontal', () => {
      const p = new Path();
      p.h(50);
      expect(p.toString()).toBe('h50 ');
    });

    it('v - relative vertical', () => {
      const p = new Path();
      p.v(50);
      expect(p.toString()).toBe('v50 ');
    });

    it('c - relative cubic bezier', () => {
      const p = new Path();
      p.c(10, 20, 30, 40, 50, 60);
      expect(p.toString()).toBe('c10 20 30 40 50 60 ');
    });

    it('q - relative quadratic bezier', () => {
      const p = new Path();
      p.q(10, 20, 30, 40);
      expect(p.toString()).toBe('q10 20 30 40 ');
    });

    it('a - relative arc', () => {
      const p = new Path();
      p.a(25, 25, 0, 1, 0, 50, 0);
      expect(p.toString()).toBe('a25 25 0 1 0 50 0 ');
    });
  });

  // ── 链式调用 ──

  describe('chaining', () => {
    it('supports fluent chaining', () => {
      const p = new Path();
      const result = p.M(0, 0).L(100, 0).L(100, 100).L(0, 100).Z();
      expect(result).toBe(p);
      expect(p.toString()).toBe('M0 0 L100 0 L100 100 L0 100 Z ');
    });
  });

  // ── clear ──

  describe('clear', () => {
    it('resets path to empty', () => {
      const p = new Path();
      p.M(0, 0).L(100, 100);
      expect(p.toString()).not.toBe('');
      p.clear();
      expect(p.toString()).toBe('');
    });
  });

  // ── 复杂路径 ──

  describe('complex paths', () => {
    it('builds triangle', () => {
      const p = new Path();
      p.M(50, 0).L(100, 100).L(0, 100).Z();
      expect(p.toString()).toBe('M50 0 L100 100 L0 100 Z ');
    });

    it('builds circle via two arcs', () => {
      const p = new Path();
      const cx = 50,
        cy = 50,
        r = 25;
      p.M(cx, cy - r).A(r, r, 0, 1, 0, cx, cy + r).A(r, r, 0, 1, 0, cx, cy - r).Z();
      const d = p.toString();
      expect(d).toContain('M50 25');
      expect(d).toContain('A25 25');
      expect(d).toContain('Z');
    });
  });
});
