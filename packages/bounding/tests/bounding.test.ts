import {describe, it, expect} from 'vitest';
import {BoundingBox} from '../src/main';

describe('BoundingBox', () => {
  // ── 静态工厂 ──

  describe('fromRect', () => {
    it('should create a bounding box from x, y, width, height', () => {
      const b = BoundingBox.fromRect(10, 20, 100, 50);
      expect(b.x).toBe(10);
      expect(b.y).toBe(20);
      expect(b.width).toBe(100);
      expect(b.height).toBe(50);
    });
  });

  describe('fromPoints', () => {
    it('should create a bounding box from two corner points', () => {
      const b = BoundingBox.fromPoints(10, 20, 110, 70);
      expect(b.x).toBe(10);
      expect(b.y).toBe(20);
      expect(b.width).toBe(100);
      expect(b.height).toBe(50);
    });
  });

  // ── 计算属性 ──

  describe('computed properties', () => {
    const b = BoundingBox.fromRect(10, 20, 100, 50);

    it('cx returns center X', () => {
      expect(b.cx).toBe(60);
    });

    it('cy returns center Y', () => {
      expect(b.cy).toBe(45);
    });

    it('right returns x + width', () => {
      expect(b.right).toBe(110);
    });

    it('bottom returns y + height', () => {
      expect(b.bottom).toBe(70);
    });

    it('radius returns min(w,h)/2', () => {
      expect(b.radius).toBe(25);
    });

    it('aspect returns h/w ratio', () => {
      expect(b.aspect).toBe(0.5);
    });

    it('area returns w*h', () => {
      expect(b.area).toBe(5000);
    });

    it('empty is false for positive dimensions', () => {
      expect(b.empty).toBe(false);
    });

    it('empty is true for zero width', () => {
      expect(BoundingBox.fromRect(0, 0, 0, 10).empty).toBe(true);
    });

    it('empty is true for negative height', () => {
      expect(BoundingBox.fromRect(0, 0, 10, -1).empty).toBe(true);
    });
  });

  // ── 设值 ──

  describe('set / copy / toArray', () => {
    it('set updates all fields and returns this', () => {
      const b = new BoundingBox();
      const ret = b.set(1, 2, 3, 4);
      expect(ret).toBe(b);
      expect(b.toArray()).toEqual([1, 2, 3, 4]);
    });

    it('copy creates independent clone', () => {
      const a = BoundingBox.fromRect(1, 2, 3, 4);
      const b = a.copy();
      b.x = 99;
      expect(a.x).toBe(1);
      expect(b.x).toBe(99);
    });
  });

  // ── 空间查询 ──

  describe('containsPoint', () => {
    const b = BoundingBox.fromRect(0, 0, 100, 100);

    it('returns true for interior point', () => {
      expect(b.containsPoint(50, 50)).toBe(true);
    });

    it('returns true for edge point', () => {
      expect(b.containsPoint(0, 0)).toBe(true);
      expect(b.containsPoint(100, 100)).toBe(true);
    });

    it('returns false for exterior point', () => {
      expect(b.containsPoint(-1, 50)).toBe(false);
      expect(b.containsPoint(101, 50)).toBe(false);
    });
  });

  describe('containsBox', () => {
    const outer = BoundingBox.fromRect(0, 0, 100, 100);
    const inner = BoundingBox.fromRect(10, 10, 20, 20);

    it('returns true when fully containing another box', () => {
      expect(outer.containsBox(inner)).toBe(true);
    });

    it('returns false when not fully containing', () => {
      expect(inner.containsBox(outer)).toBe(false);
    });
  });

  describe('intersects', () => {
    it('returns true for overlapping boxes', () => {
      const a = BoundingBox.fromRect(0, 0, 50, 50);
      const b = BoundingBox.fromRect(25, 25, 50, 50);
      expect(a.intersects(b)).toBe(true);
    });

    it('returns false for non-overlapping boxes', () => {
      const a = BoundingBox.fromRect(0, 0, 10, 10);
      const b = BoundingBox.fromRect(20, 20, 10, 10);
      expect(a.intersects(b)).toBe(false);
    });

    it('returns false for touching edges (not overlapping)', () => {
      const a = BoundingBox.fromRect(0, 0, 10, 10);
      const b = BoundingBox.fromRect(10, 0, 10, 10);
      expect(a.intersects(b)).toBe(false);
    });
  });

  // ── 变换 ──

  describe('intersection', () => {
    it('returns the intersection region of two boxes', () => {
      const a = BoundingBox.fromRect(0, 0, 100, 100);
      const b = BoundingBox.fromRect(50, 50, 100, 100);
      const c = a.intersection(b);
      expect(c.toArray()).toEqual([50, 50, 50, 50]);
    });
  });

  describe('union', () => {
    it('returns the bounding region of two boxes', () => {
      const a = BoundingBox.fromRect(10, 20, 30, 40);
      const b = BoundingBox.fromRect(50, 60, 70, 80);
      const u = a.union(b);
      expect(u.x).toBe(10);
      expect(u.y).toBe(20);
      expect(u.right).toBe(120);
      expect(u.bottom).toBe(140);
    });
  });

  describe('expandPoint', () => {
    it('expands to include a point outside the box', () => {
      const b = BoundingBox.fromRect(10, 10, 10, 10);
      const e = b.expandPoint(0, 0);
      expect(e.x).toBe(0);
      expect(e.y).toBe(0);
      expect(e.right).toBe(20);
      expect(e.bottom).toBe(20);
    });

    it('does not shrink when point is inside', () => {
      const b = BoundingBox.fromRect(0, 0, 100, 100);
      const e = b.expandPoint(50, 50);
      expect(e.toArray()).toEqual([0, 0, 100, 100]);
    });
  });

  describe('pad', () => {
    it('inward padding reduces size', () => {
      const b = BoundingBox.fromRect(0, 0, 100, 100);
      const p = b.pad([10, 10, 10, 10]);
      expect(p.toArray()).toEqual([10, 10, 80, 80]);
    });

    it('outward padding increases size', () => {
      const b = BoundingBox.fromRect(10, 10, 100, 100);
      const p = b.pad([5, 5, 5, 5], true);
      expect(p.toArray()).toEqual([5, 5, 110, 110]);
    });
  });

  describe('localXY', () => {
    it('converts global coordinates to local', () => {
      const b = BoundingBox.fromRect(100, 200, 50, 50);
      expect(b.localXY(110, 220)).toEqual([10, 20]);
    });
  });

  // ── 分割 ──

  describe('divideX / divideY', () => {
    const b = BoundingBox.fromRect(0, 0, 100, 80);

    it('divideX splits horizontally', () => {
      const d = b.divideX(4, 2);
      expect(d.x).toBe(50);
      expect(d.width).toBe(25);
      expect(d.height).toBe(80);
    });

    it('divideY splits vertically', () => {
      const d = b.divideY(4, 1);
      expect(d.y).toBe(20);
      expect(d.height).toBe(20);
      expect(d.width).toBe(100);
    });
  });

  describe('divideXByScale / divideYByScale', () => {
    const b = BoundingBox.fromRect(0, 0, 100, 100);
    const scale = {scale: (i: number) => i * 25, bandwidth: 20};

    it('divideXByScale uses scale function', () => {
      const d = b.divideXByScale(scale, 2);
      expect(d.x).toBe(50);
      expect(d.width).toBe(20);
    });

    it('divideYByScale uses scale function', () => {
      const d = b.divideYByScale(scale, 1);
      expect(d.y).toBe(25);
      expect(d.height).toBe(20);
    });
  });

  describe('vertices', () => {
    it('returns four corners in correct order', () => {
      const b = BoundingBox.fromRect(10, 20, 30, 40);
      expect(b.vertices()).toEqual([
        [10, 20],
        [10, 60],
        [40, 60],
        [40, 20],
      ]);
    });
  });
});
