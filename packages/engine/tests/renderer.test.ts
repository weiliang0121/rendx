import {describe, it, expect, vi} from 'vitest';

// Mock rendx-canvas 和 rendx-svg 避免 OffscreenCanvas 依赖
vi.mock('rendx-canvas', () => ({
  CanvasRenderer: class {
    el = document.createElement('canvas');
    resize() {}
    dispose() {}
  },
}));
vi.mock('rendx-svg', () => ({
  SvgRenderer: class {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    resize() {}
    dispose() {}
  },
}));

import {Renderer} from '../src/renderers/renderer';
import {Node} from '../src/scene/node';

import type {IGraphicsRenderer} from 'rendx-core';

/** 模拟 IGraphicsRenderer */
interface MockRenderer extends IGraphicsRenderer {
  calls: string[];
}

function createMockRenderer(): MockRenderer {
  const calls: string[] = [];
  const el = document.createElement('canvas');
  return {
    calls,
    get el() {
      return el;
    },
    getSize: vi.fn(() => ({width: 800, height: 600})),
    clear: vi.fn(() => calls.push('clear')),
    save: vi.fn(() => calls.push('save')),
    restore: vi.fn(() => calls.push('restore')),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(() => calls.push('setTransform')),
    setAttributes: vi.fn(() => calls.push('setAttributes')),
    text: vi.fn(() => calls.push('text')),
    circle: vi.fn(() => calls.push('circle')),
    rect: vi.fn(() => calls.push('rect')),
    line: vi.fn(() => calls.push('line')),
    path: vi.fn(() => calls.push('path')),
    image: vi.fn(() => calls.push('image')),
    gradient: vi.fn(() => calls.push('gradient')),
    clipPath: vi.fn(() => calls.push('clipPath')),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('Renderer', () => {
  describe('构造与配置', () => {
    it('支持注入外部 IGraphicsRenderer', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock, width: 400, height: 300});
      expect(renderer.el).toBe(mock.el);
    });

    it('默认配置 800x600 canvas', () => {
      const renderer = new Renderer({});
      expect(renderer.cfg.width).toBe(800);
      expect(renderer.cfg.height).toBe(600);
    });
  });

  describe('viewMatrix 视口矩阵', () => {
    it('默认 viewport = 全画布, 矩阵为 identity', () => {
      const renderer = new Renderer({width: 800, height: 600});
      const m = renderer.viewMatrix;
      // sx=1, sy=1, tx=0, ty=0
      expect(m[0]).toBeCloseTo(1);
      expect(m[3]).toBeCloseTo(1);
      expect(m[4]).toBeCloseTo(0);
      expect(m[5]).toBeCloseTo(0);
    });

    it('自定义 viewport 计算正确的缩放和偏移', () => {
      // viewport [0, 0, 400, 300] → 800x600 canvas: sx=2, sy=2
      const renderer = new Renderer({width: 800, height: 600, viewport: [0, 0, 400, 300]});
      const m = renderer.viewMatrix;
      expect(m[0]).toBeCloseTo(2); // sx
      expect(m[3]).toBeCloseTo(2); // sy
      expect(m[4]).toBeCloseTo(0); // tx
      expect(m[5]).toBeCloseTo(0); // ty
    });

    it('viewport 带偏移', () => {
      // viewport [100, 50, 400, 300] → 800x600 canvas
      const renderer = new Renderer({width: 800, height: 600, viewport: [100, 50, 400, 300]});
      const m = renderer.viewMatrix;
      expect(m[0]).toBeCloseTo(2); // sx = 800/400
      expect(m[3]).toBeCloseTo(2); // sy = 600/300
      expect(m[4]).toBeCloseTo(-200); // tx = -100 * 2
      expect(m[5]).toBeCloseTo(-100); // ty = -50 * 2
    });

    it('resize 重新计算 viewMatrix', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock, width: 800, height: 600});
      renderer.resize({width: 400, height: 300});
      expect(renderer.cfg.width).toBe(400);
      expect(renderer.cfg.height).toBe(300);
      // 默认 viewport = 全画布, 所以矩阵仍为 identity
      expect(renderer.viewMatrix[0]).toBeCloseTo(1);
    });
  });

  describe('draw() 渲染队列', () => {
    it('空队列只调用 clear', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock});
      renderer.draw([]);
      expect(mock.clear).toHaveBeenCalledOnce();
      expect(mock.save).not.toHaveBeenCalled();
    });

    it('渲染圆形节点', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock});
      const node = Node.create('circle', {fill: 'red'});
      node.shape.from(50, 50, 25);
      node.update();
      renderer.draw([node]);

      expect(mock.calls).toEqual(['clear', 'save', 'setTransform', 'setAttributes', 'circle', 'restore']);
      expect(mock.circle).toHaveBeenCalledWith(50, 50, 25);
    });

    it('渲染矩形节点', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock});
      const node = Node.create('rect', {fill: 'blue'});
      node.shape.from(10, 20, 100, 50);
      node.update();
      renderer.draw([node]);

      expect(mock.rect).toHaveBeenCalledWith(10, 20, 100, 50);
    });

    it('不可见节点被跳过', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock});
      const node = Node.create('rect', {fill: 'red'});
      node.setVisible(false);
      node.update();
      renderer.draw([node]);

      expect(mock.save).not.toHaveBeenCalled();
    });

    it('gradient 和 clipPath 在 setTransform 之前设置', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock});
      const node = Node.create('rect', {fill: 'red'});
      node.attrs.gradient({id: 'g1', type: 'linear', direction: [0, 0, 1, 1], stops: []});
      node.attrs.clip({id: 'clip1', path: 'M0 0'});
      node.update();
      renderer.draw([node]);

      const gradientIdx = mock.calls.indexOf('gradient');
      const clipPathIdx = mock.calls.indexOf('clipPath');
      const setTransformIdx = mock.calls.indexOf('setTransform');
      expect(gradientIdx).toBeLessThan(setTransformIdx);
      expect(clipPathIdx).toBeLessThan(setTransformIdx);
    });

    it('渲染 image 节点（source 已加载）', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock});
      const node = Node.create('image', {});
      // 模拟已加载的图片：直接设置 source
      const fakeImg = document.createElement('img');
      const shape = node.shape as import('../src/shapes/image').ImageShape;
      shape.fromElement(fakeImg, 10, 20, 64, 64);
      node.update();
      renderer.draw([node]);

      expect(mock.calls).toEqual(['clear', 'save', 'setTransform', 'setAttributes', 'image', 'restore']);
      expect(mock.image).toHaveBeenCalledWith(fakeImg, 10, 20, 64, 64);
    });

    it('image source 未加载时跳过绘制', () => {
      const mock = createMockRenderer();
      const renderer = new Renderer({renderer: mock});
      const node = Node.create('image', {});
      // shape.source 默认为 null，不应调用 r.image()
      node.update();
      renderer.draw([node]);

      expect(mock.image).not.toHaveBeenCalled();
      // 但 save/restore 仍会被调用（节点 renderable）
      expect(mock.calls).toEqual(['clear', 'save', 'setTransform', 'setAttributes', 'restore']);
    });
  });
});
