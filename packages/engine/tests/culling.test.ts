import {describe, it, expect, vi} from 'vitest';

// Mock rendx-canvas 和 rendx-svg 避免 OffscreenCanvas 依赖
vi.mock('rendx-canvas', () => ({
  CanvasRenderer: class {
    el = document.createElement('canvas');
    resize() {}
    dispose() {}
    clear() {}
    save() {}
    restore() {}
    setTransform() {}
    setAttributes() {}
    rect() {}
    text() {}
    circle() {}
    line() {}
    path() {}
    image() {}
    gradient() {}
    clipPath() {}
  },
}));
vi.mock('rendx-svg', () => ({
  SvgRenderer: class {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    resize() {}
    dispose() {}
    clear() {}
  },
}));

import {Layer} from '../src/scene/layer';
import {Node} from '../src/scene';

function createRect(name: string, x: number, y: number, w: number, h: number, z = 0) {
  const node = Node.create('rect', {fill: 'red'});
  node.setName(name);
  node.shape.from(x, y, w, h);
  node.z = z;
  return node;
}

describe('Viewport Culling - 视口裁剪', () => {
  describe('Node.getWorldBBox()', () => {
    it('返回世界空间 AABB（无变换时 = 本地 BBox）', () => {
      const node = createRect('r', 10, 20, 100, 50);
      node.update(); // 构建 shape.boundingBox + worldMatrix

      const wbb = node.getWorldBBox()!;
      expect(wbb).not.toBeNull();
      expect(wbb.x).toBe(10);
      expect(wbb.y).toBe(20);
      expect(wbb.width).toBe(100);
      expect(wbb.height).toBe(50);
    });

    it('应用 translate 后 worldBBox 正确偏移', () => {
      const node = createRect('r', 0, 0, 50, 50);
      node.translate(100, 200);
      node.update();

      const wbb = node.getWorldBBox()!;
      expect(wbb.x).toBeCloseTo(100);
      expect(wbb.y).toBeCloseTo(200);
      expect(wbb.width).toBeCloseTo(50);
      expect(wbb.height).toBeCloseTo(50);
    });

    it('应用 scale 后 worldBBox 正确缩放', () => {
      const node = createRect('r', 0, 0, 50, 50);
      node.scale(2, 3);
      node.update();

      const wbb = node.getWorldBBox()!;
      expect(wbb.x).toBeCloseTo(0);
      expect(wbb.y).toBeCloseTo(0);
      expect(wbb.width).toBeCloseTo(100);
      expect(wbb.height).toBeCloseTo(150);
    });

    it('应用 rotation 后 worldBBox 正确扩展', () => {
      const node = createRect('r', -50, -25, 100, 50);
      // 旋转 90°
      node.rotate(Math.PI / 2);
      node.update();

      const wbb = node.getWorldBBox()!;
      expect(wbb).not.toBeNull();
      // 100x50 矩形旋转 90° → 50x100
      expect(wbb.width).toBeCloseTo(50, 0);
      expect(wbb.height).toBeCloseTo(100, 0);
    });

    it('boundingBox 为空时返回 null', () => {
      const node = Node.create('text', {fill: 'red'});
      node.update();

      const wbb = node.getWorldBBox();
      expect(wbb).toBeNull();
    });
  });

  describe('Layer.draw() 视口裁剪', () => {
    function createLayerWithSize(w: number, h: number) {
      return new Layer('test', 0, {width: w, height: h});
    }

    it('视口内的节点正常渲染', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const n = createRect('inside', 100, 100, 50, 50);
      layer.add(n);
      layer.draw();

      expect(drawSpy).toHaveBeenCalledTimes(1);
      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).toContain(n);
    });

    it('完全在视口外（右侧）的节点被裁剪', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const outside = createRect('outside', 900, 100, 50, 50);
      const inside = createRect('inside', 100, 100, 50, 50);
      layer.add(outside);
      layer.add(inside);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).not.toContain(outside);
      expect(drawnQueue).toContain(inside);
    });

    it('完全在视口外（左侧）的节点被裁剪', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const outside = createRect('outside', -200, 100, 50, 50);
      layer.add(outside);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).not.toContain(outside);
    });

    it('完全在视口外（上方）的节点被裁剪', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const outside = createRect('outside', 100, -200, 50, 50);
      layer.add(outside);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).not.toContain(outside);
    });

    it('完全在视口外（下方）的节点被裁剪', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const outside = createRect('outside', 100, 700, 50, 50);
      layer.add(outside);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).not.toContain(outside);
    });

    it('部分在视口内的节点保留（左边缘）', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      // 节点从 -25 到 25，与视口左边缘有交叉
      const partial = createRect('partial', -25, 100, 50, 50);
      layer.add(partial);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).toContain(partial);
    });

    it('部分在视口内的节点保留（右边缘）', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      // 节点从 775 到 825，与视口右边缘有交叉
      const partial = createRect('partial', 775, 100, 50, 50);
      layer.add(partial);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).toContain(partial);
    });

    it('无有效 boundingBox 的节点不被裁剪（如 Text）', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      // Text 没有实际 boundingBox，应该保留
      const text = Node.create('text', {fill: 'black'});
      text.setName('label');
      layer.add(text);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).toContain(text);
    });

    it('带 translate 变换的节点裁剪正确', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      // 节点本地坐标 (0,0,50,50)，但 translate 到 (900, 100)，视口外
      const moved = createRect('moved', 0, 0, 50, 50);
      moved.translate(900, 100);
      layer.add(moved);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).not.toContain(moved);
    });

    it('带 translate 变换移入视口内的节点保留', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      // 节点本地坐标 (-1000, -1000)，但 translate 到视口内
      const moved = createRect('moved', -1000, -1000, 50, 50);
      moved.translate(1100, 1100);
      layer.add(moved);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).toContain(moved);
    });

    it('多个节点混合裁剪', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const inside1 = createRect('in1', 100, 100, 50, 50, 1);
      const inside2 = createRect('in2', 400, 300, 50, 50, 2);
      const outside1 = createRect('out1', -200, -200, 50, 50, 3);
      const outside2 = createRect('out2', 1000, 1000, 50, 50, 4);
      const partial = createRect('partial', 780, 580, 50, 50, 5);

      layer.add(inside1);
      layer.add(inside2);
      layer.add(outside1);
      layer.add(outside2);
      layer.add(partial);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).toContain(inside1);
      expect(drawnQueue).toContain(inside2);
      expect(drawnQueue).not.toContain(outside1);
      expect(drawnQueue).not.toContain(outside2);
      expect(drawnQueue).toContain(partial);
      expect(drawnQueue.length).toBe(3);
    });

    it('getQueue() 不受裁剪影响（仍返回全部节点）', () => {
      const layer = createLayerWithSize(800, 600);

      const inside = createRect('in', 100, 100, 50, 50);
      const outside = createRect('out', 2000, 2000, 50, 50);
      layer.add(inside);
      layer.add(outside);

      const fullQueue = layer.getQueue();
      expect(fullQueue.length).toBe(2);
      expect(fullQueue).toContain(inside);
      expect(fullQueue).toContain(outside);
    });

    it('视口恰好在边界上的节点不被裁剪', () => {
      const layer = createLayerWithSize(800, 600);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      // 节点右边缘 = 视口左边缘 (maxX=0, 不满足 maxX > 0)
      const atEdge = createRect('edge', -50, 100, 50, 50);
      layer.add(atEdge);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      // 节点恰好在边界外 (right=0, 不 > 0)，应被裁剪
      expect(drawnQueue).not.toContain(atEdge);
    });

    it('事件层不执行裁剪和绘制', () => {
      const layer = new Layer('evt', 99999, {width: 800, height: 600}, true);
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      layer.add(createRect('n', 100, 100, 50, 50));
      layer.draw();

      expect(drawSpy).not.toHaveBeenCalled();
    });
  });

  describe('culling 开关', () => {
    function createLayerWithSize(w: number, h: number) {
      return new Layer('test', 0, {width: w, height: h});
    }

    it('默认 culling = true', () => {
      const layer = createLayerWithSize(800, 600);
      expect(layer.culling).toBe(true);
    });

    it('事件层默认 culling = false', () => {
      const layer = new Layer('evt', 99999, {}, true);
      expect(layer.culling).toBe(false);
    });

    it('culling = false 时跳过裁剪，视口外节点也传入 renderer', () => {
      const layer = createLayerWithSize(800, 600);
      layer.culling = false;
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const outside = createRect('outside', 2000, 2000, 50, 50);
      const inside = createRect('inside', 100, 100, 50, 50);
      layer.add(outside);
      layer.add(inside);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).toContain(outside);
      expect(drawnQueue).toContain(inside);
      expect(drawnQueue.length).toBe(2);
    });

    it('culling = true 时正常裁剪', () => {
      const layer = createLayerWithSize(800, 600);
      layer.culling = true;
      const drawSpy = vi.spyOn(layer.renderer, 'draw');

      const outside = createRect('outside', 2000, 2000, 50, 50);
      const inside = createRect('inside', 100, 100, 50, 50);
      layer.add(outside);
      layer.add(inside);
      layer.draw();

      const drawnQueue = drawSpy.mock.calls[0][0];
      expect(drawnQueue).not.toContain(outside);
      expect(drawnQueue).toContain(inside);
      expect(drawnQueue.length).toBe(1);
    });
  });
});
