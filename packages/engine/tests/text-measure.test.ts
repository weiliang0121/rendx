import {describe, it, expect, vi, afterEach} from 'vitest';

// Mock @dye/canvas 和 @dye/svg 避免 OffscreenCanvas 依赖
vi.mock('@dye/canvas', () => ({
  CanvasRenderer: class {
    el = document.createElement('canvas');
    resize() {}
    dispose() {}
    clear() {}
  },
}));
vi.mock('@dye/svg', () => ({
  SvgRenderer: class {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    resize() {}
    dispose() {}
    clear() {}
  },
}));

import {BoundingBox} from '@dye/bounding';
import {TextShape} from '../src/shapes/text';
import {Node} from '../src/scene/node';

import type {TextMeasureFn} from '../src/shapes/text';

describe('TextShape - 文本测量注入', () => {
  afterEach(() => {
    TextShape.defaultMeasure = null;
  });

  describe('无测量函数', () => {
    it('默认无 boundingBox', () => {
      const shape = new TextShape();
      shape.from('hello', 10, 20);
      shape.build();
      expect(shape.boundingBox.empty).toBe(true);
    });

    it('hit 返回 false', () => {
      const shape = new TextShape();
      shape.from('hello', 10, 20);
      expect(shape.hit([15, 15])).toBe(false);
    });
  });

  describe('全局注入 defaultMeasure', () => {
    it('设置 defaultMeasure 后 box() 生成包围盒', () => {
      const mockMeasure: TextMeasureFn = (text) => {
        return BoundingBox.fromRect(0, 0, text.length * 8, 14);
      };
      TextShape.defaultMeasure = mockMeasure;

      const shape = new TextShape();
      shape.from('hello', 10, 20);
      shape.build();

      const bb = shape.boundingBox;
      expect(bb.empty).toBe(false);
      expect(bb.width).toBe(40); // 5 * 8
      expect(bb.height).toBe(14);
      // x 应为 shape.x，y 应为 shape.y - height（文本基线偏移）
      expect(bb.x).toBe(10);
      expect(bb.y).toBe(6); // 20 - 14
    });

    it('测量函数收到 attrs', () => {
      const spy = vi.fn(() => BoundingBox.fromRect(0, 0, 50, 12));
      TextShape.defaultMeasure = spy;

      const shape = new TextShape();
      shape.setAttrs({fontSize: 16, fontFamily: 'Arial'});
      shape.from('test', 0, 0);
      shape.build();

      expect(spy).toHaveBeenCalledWith('test', {fontSize: 16, fontFamily: 'Arial'});
    });

    it('空文本不调用测量函数', () => {
      const spy = vi.fn(() => BoundingBox.fromRect(0, 0, 0, 0));
      TextShape.defaultMeasure = spy;

      const shape = new TextShape();
      shape.from('', 0, 0);
      shape.build();

      expect(spy).not.toHaveBeenCalled();
    });

    it('测量函数返回 null → 保持空包围盒', () => {
      TextShape.defaultMeasure = () => null;

      const shape = new TextShape();
      shape.from('hello', 10, 20);
      shape.build();

      expect(shape.boundingBox.empty).toBe(true);
    });
  });

  describe('实例级 measure 覆盖', () => {
    it('实例 measure 优先于 defaultMeasure', () => {
      const globalFn = vi.fn(() => BoundingBox.fromRect(0, 0, 100, 20));
      const instanceFn = vi.fn(() => BoundingBox.fromRect(0, 0, 50, 10));

      TextShape.defaultMeasure = globalFn;
      const shape = new TextShape();
      shape.measure = instanceFn;
      shape.from('hi', 0, 0);
      shape.build();

      expect(instanceFn).toHaveBeenCalled();
      expect(globalFn).not.toHaveBeenCalled();
      expect(shape.boundingBox.width).toBe(50);
    });

    it('实例 measure 设为 null 回退到 defaultMeasure', () => {
      const globalFn = vi.fn(() => BoundingBox.fromRect(0, 0, 100, 20));

      TextShape.defaultMeasure = globalFn;
      const shape = new TextShape();
      shape.measure = null;
      shape.from('hi', 0, 0);
      shape.build();

      expect(globalFn).toHaveBeenCalled();
    });
  });

  describe('hit test', () => {
    it('有 bbox 时 hit 正常工作', () => {
      TextShape.defaultMeasure = (text) =>
        BoundingBox.fromRect(0, 0, text.length * 10, 14);

      const shape = new TextShape();
      shape.from('hello', 10, 20);
      shape.build();

      // bbox: x=10, y=6(20-14), w=50, h=14 → [10,6] ~ [60,20]
      expect(shape.hit([30, 10])).toBe(true); // 内部
      expect(shape.hit([5, 10])).toBe(false); // 左侧外
      expect(shape.hit([30, 25])).toBe(false); // 下方外
    });
  });

  describe('与 Node 集成', () => {
    it('Node.update() 把 attrs 注入 TextShape', () => {
      TextShape.defaultMeasure = (_text, attrs) => {
        const size = (attrs.fontSize as number) ?? 12;
        return BoundingBox.fromRect(0, 0, _text.length * size * 0.6, size);
      };

      const node = Node.create('text', {fontSize: 16, fontFamily: 'Arial', fill: 'black'});
      node.shape.from('hello', 0, 20);
      node.update();

      const bb = node.shape.boundingBox;
      expect(bb.empty).toBe(false);
      expect(bb.width).toBeCloseTo(48); // 5 * 16 * 0.6
      expect(bb.height).toBe(16);
    });

    it('TextShape bbox 参与视口裁剪', () => {
      TextShape.defaultMeasure = (text) =>
        BoundingBox.fromRect(0, 0, text.length * 10, 14);

      const node = Node.create('text', {fill: 'black'});
      node.shape.from('hello', 10, 20);
      node.update();

      // getWorldBBox 应该返回有效包围盒
      const worldBB = node.getWorldBBox();
      expect(worldBB).not.toBeNull();
      expect(worldBB!.empty).toBe(false);
    });

    it('无测量函数时 getWorldBBox 返回 null', () => {
      TextShape.defaultMeasure = null;

      const node = Node.create('text', {fill: 'black'});
      node.shape.from('hello', 10, 20);
      node.update();

      const worldBB = node.getWorldBBox();
      expect(worldBB).toBeNull();
    });
  });

  describe('缓存行为', () => {
    it('文本不变时 build 不重复测量', () => {
      const spy = vi.fn(() => BoundingBox.fromRect(0, 0, 50, 14));
      TextShape.defaultMeasure = spy;

      const shape = new TextShape();
      shape.from('hello', 0, 0);
      shape.build();
      expect(spy).toHaveBeenCalledTimes(1);

      // 第二次 build，needUpdate 为 false，不会再调用
      shape.build();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('文本变化后重新测量', () => {
      const spy = vi.fn(() => BoundingBox.fromRect(0, 0, 50, 14));
      TextShape.defaultMeasure = spy;

      const shape = new TextShape();
      shape.from('hello', 0, 0);
      shape.build();
      expect(spy).toHaveBeenCalledTimes(1);

      shape.from('world!', 0, 0);
      shape.build();
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
