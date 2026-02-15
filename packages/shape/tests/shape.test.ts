import {describe, it, expect} from 'vitest';
import {Path} from 'rendx-path';
import {
  createCircle,
  createRect,
  createRectNormal,
  createRectRounded,
  createArc,
  createSectorNormal,
  createLine,
  createShape,
} from '../src/main';

const mkPath = () => new Path();

describe('createCircle', () => {
  it('generates a circle path with two arcs', () => {
    const p = mkPath();
    createCircle(p, {cx: 50, cy: 50, r: 25});
    const d = p.toString();
    expect(d).toContain('M50 25'); // top of circle
    expect(d).toContain('A25 25');
    expect(d).toContain('Z');
  });

  it('handles zero radius', () => {
    const p = mkPath();
    createCircle(p, {cx: 0, cy: 0, r: 0});
    expect(p.toString()).toContain('A0 0');
  });
});

describe('createRect', () => {
  describe('createRectNormal', () => {
    it('generates a rectangle path', () => {
      const p = mkPath();
      createRectNormal(p, {x: 10, y: 20, width: 100, height: 50});
      const d = p.toString();
      expect(d).toContain('M10 20');
      expect(d).toContain('L110 20');
      expect(d).toContain('L110 70');
      expect(d).toContain('L10 70');
      expect(d).toContain('Z');
    });
  });

  describe('createRectRounded', () => {
    it('generates a rounded rectangle with uniform radius', () => {
      const p = mkPath();
      createRectRounded(p, {x: 0, y: 0, width: 100, height: 50, rx: 5, ry: 5});
      const d = p.toString();
      expect(d).toContain('M5 0'); // starts offset by rx
      expect(d).toContain('A'); // has arc commands
      expect(d).toContain('Z');
    });

    it('generates rounded rect with per-corner radius', () => {
      const p = mkPath();
      createRectRounded(p, {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        rx: [5, 10, 5, 10],
        ry: [5, 10, 5, 10],
      });
      const d = p.toString();
      expect(d).toContain('A');
      expect(d).toContain('Z');
    });
  });

  describe('createRect dispatcher', () => {
    it('uses normal rect when no radius', () => {
      const p = mkPath();
      createRect(p, {x: 0, y: 0, width: 50, height: 50});
      const d = p.toString();
      expect(d).not.toContain('A'); // no arcs
    });

    it('uses rounded rect when rx and ry are set', () => {
      const p = mkPath();
      createRect(p, {x: 0, y: 0, width: 50, height: 50, rx: 5, ry: 5});
      const d = p.toString();
      expect(d).toContain('A'); // has arcs
    });
  });
});

describe('createArc', () => {
  it('generates an arc path', () => {
    const p = mkPath();
    createArc(p, {
      cx: 100,
      cy: 100,
      r: 50,
      startAngle: 0,
      endAngle: Math.PI,
      radius: 1,
    });
    const d = p.toString();
    expect(d).toContain('M');
    expect(d).toContain('A');
  });

  it('generates full circle for 2PI range', () => {
    const p = mkPath();
    createArc(p, {
      cx: 100,
      cy: 100,
      r: 50,
      startAngle: 0,
      endAngle: Math.PI * 2,
      radius: 1,
    });
    const d = p.toString();
    // Should fall back to createCircle which uses Z
    expect(d).toContain('Z');
  });
});

describe('createSectorNormal', () => {
  it('generates a sector path', () => {
    const p = mkPath();
    createSectorNormal(p, {
      cx: 100,
      cy: 100,
      r: 50,
      startAngle: 0,
      endAngle: Math.PI / 2,
      innerRadius: 0,
      outerRadius: 1,
    });
    const d = p.toString();
    expect(d).toContain('M');
    expect(d).toContain('A');
    expect(d).toContain('L100 100'); // lines to center when innerRadius = 0
    expect(d).toContain('Z');
  });

  it('generates annular sector with inner radius', () => {
    const p = mkPath();
    createSectorNormal(p, {
      cx: 100,
      cy: 100,
      r: 50,
      startAngle: 0,
      endAngle: Math.PI / 2,
      innerRadius: 0.5,
      outerRadius: 1,
    });
    const d = p.toString();
    // Should have two arcs (outer and inner)
    const arcs = d.match(/A/g);
    expect(arcs!.length).toBe(2);
  });
});

describe('createLine', () => {
  it('generates a line path from points', () => {
    const p = mkPath();
    createLine(p, {
      points: [
        [0, 0],
        [50, 100],
        [100, 50],
      ],
    });
    const d = p.toString();
    expect(d).toContain('M0 0');
    expect(d).toContain('L');
  });
});

describe('createShape factory', () => {
  it('dispatches circle', () => {
    const p = mkPath();
    createShape(p, 'circle', {cx: 50, cy: 50, r: 25});
    expect(p.toString()).toContain('A25 25');
  });

  it('dispatches rect', () => {
    const p = mkPath();
    createShape(p, 'rect', {x: 0, y: 0, width: 100, height: 50});
    expect(p.toString()).toContain('M0 0');
    expect(p.toString()).toContain('Z');
  });

  it('throws for unknown type', () => {
    const p = mkPath();
    expect(() => createShape(p, 'unknown' as any, {} as any)).toThrow('Unknown shape type');
  });
});
