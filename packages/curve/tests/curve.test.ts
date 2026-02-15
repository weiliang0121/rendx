import {describe, it, expect} from 'vitest';
import {Path} from 'rendx-path';
import {
  linear,
  step,
  stepBefore,
  stepAfter,
  bumpX,
  bumpY,
  natural,
  monotoneX,
  monotoneY,
  basis,
  cardinal,
  catmullRom,
  curveMap,
} from '../src/main';

const mkPath = (): Path => new Path();

const simplePoints: [number, number][] = [
  [0, 0],
  [50, 100],
  [100, 50],
  [150, 80],
];

const twoPoints: [number, number][] = [
  [0, 0],
  [100, 100],
];

describe('curve', () => {
  // ── linear ──

  describe('linear', () => {
    it('generates L commands for each point', () => {
      const p = mkPath();
      linear(p, simplePoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('L50 100');
      expect(d).toContain('L100 50');
      expect(d).toContain('L150 80');
    });

    it('does nothing for empty points', () => {
      const p = mkPath();
      linear(p, []);
      expect(p.toString()).toBe('');
    });

    it('start=false skips M command', () => {
      const p = mkPath();
      p.M(10, 10); // existing M
      linear(p, simplePoints, false);
      const d = p.toString();
      // Should start with the manual M, not have M0 0
      expect(d).toContain('M10 10');
      expect(d).toContain('L50 100');
    });
  });

  // ── step ──

  describe('step', () => {
    it('generates step commands via midpoint', () => {
      const p = mkPath();
      step(p, twoPoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('L50 0'); // midpoint x, first y
      expect(d).toContain('L50 100'); // midpoint x, second y
      expect(d).toContain('L100 100'); // end point
    });
  });

  describe('stepBefore', () => {
    it('steps vertically before horizontal', () => {
      const p = mkPath();
      stepBefore(p, twoPoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('L0 100'); // first x, second y
      expect(d).toContain('L100 100');
    });
  });

  describe('stepAfter', () => {
    it('steps horizontally before vertical', () => {
      const p = mkPath();
      stepAfter(p, twoPoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('L100 0'); // second x, first y
      expect(d).toContain('L100 100');
    });
  });

  // ── bump ──

  describe('bumpX', () => {
    it('generates cubic bezier with midpoint control', () => {
      const p = mkPath();
      bumpX(p, twoPoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('C50 0 50 100 100 100');
    });

    it('handles empty points', () => {
      const p = mkPath();
      bumpX(p, []);
      expect(p.toString()).toBe('');
    });
  });

  describe('bumpY', () => {
    it('generates cubic bezier with y midpoint control', () => {
      const p = mkPath();
      bumpY(p, twoPoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('C0 50 100 50 100 100');
    });
  });

  // ── natural ──

  describe('natural', () => {
    it('generates smooth cubic bezier curve', () => {
      const p = mkPath();
      natural(p, simplePoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      // Should have 3 C commands for 4 points
      const cParts = d.match(/C/g);
      expect(cParts).toHaveLength(3);
    });

    it('does nothing for 1 point', () => {
      const p = mkPath();
      natural(p, [[5, 5]]);
      expect(p.toString()).toBe('');
    });
  });

  // ── monotone ──

  describe('monotoneX', () => {
    it('preserves monotonicity', () => {
      const p = mkPath();
      monotoneX(p, simplePoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('C');
    });

    it('falls back to L for 2 points', () => {
      const p = mkPath();
      monotoneX(p, twoPoints);
      const d = p.toString();
      expect(d).toContain('L100 100');
    });

    it('handles single point', () => {
      const p = mkPath();
      monotoneX(p, [[5, 5]]);
      expect(p.toString()).toBe('M5 5 ');
    });
  });

  describe('monotoneY', () => {
    it('generates curve in Y direction', () => {
      const p = mkPath();
      monotoneY(p, simplePoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('C');
    });
  });

  // ── basis ──

  describe('basis', () => {
    it('generates B-spline curve', () => {
      const p = mkPath();
      basis(p, simplePoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('C');
    });

    it('falls back to L for less than 3 points', () => {
      const p = mkPath();
      basis(p, twoPoints);
      const d = p.toString();
      expect(d).toContain('L100 100');
    });
  });

  // ── cardinal ──

  describe('cardinal', () => {
    it('generates cardinal spline with default tension', () => {
      const curve = cardinal();
      const p = mkPath();
      curve(p, simplePoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('C');
    });

    it('generates with custom tension', () => {
      const curve = cardinal(0.5);
      const p = mkPath();
      curve(p, simplePoints);
      expect(p.toString()).toContain('C');
    });

    it('falls back for < 3 points', () => {
      const curve = cardinal();
      const p = mkPath();
      curve(p, twoPoints);
      expect(p.toString()).toContain('L100 100');
    });
  });

  // ── catmullRom ──

  describe('catmullRom', () => {
    it('generates Catmull-Rom curve', () => {
      const curve = catmullRom();
      const p = mkPath();
      curve(p, simplePoints);
      const d = p.toString();
      expect(d).toContain('M0 0');
      expect(d).toContain('C');
    });

    it('works with custom alpha', () => {
      const curve = catmullRom(1);
      const p = mkPath();
      curve(p, simplePoints);
      expect(p.toString()).toContain('C');
    });
  });

  // ── curveMap registry ──

  describe('curveMap', () => {
    it('contains all registered curves', () => {
      expect(curveMap.linear).toBe(linear);
      expect(curveMap.natural).toBe(natural);
      expect(curveMap.step).toBe(step);
      expect(curveMap['step-before']).toBe(stepBefore);
      expect(curveMap['step-after']).toBe(stepAfter);
      expect(curveMap['bump-x']).toBe(bumpX);
      expect(curveMap['bump-y']).toBe(bumpY);
      expect(curveMap['monotone-x']).toBe(monotoneX);
      expect(curveMap['monotone-y']).toBe(monotoneY);
      expect(curveMap.basis).toBe(basis);
    });

    it('cardinal and catmull-rom are function instances', () => {
      expect(typeof curveMap.cardinal).toBe('function');
      expect(typeof curveMap['catmull-rom']).toBe('function');
    });
  });
});
