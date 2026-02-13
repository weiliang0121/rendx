import {describe, it, expect, vi} from 'vitest';

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

import {Layer} from '../src/scene/layer';
import {Scene, Node, Group} from '../src/scene';

function createNode(name: string, z = 0) {
  const node = Node.create('rect', {fill: 'red'});
  node.setName(name);
  node.z = z;
  return node;
}

describe('Layer - 分层渲染', () => {
  describe('基本属性', () => {
    it('type = 4', () => {
      const layer = new Layer('test', 0, {});
      expect(layer.type).toBe(4);
    });

    it('layerName 和 layerIndex 正确', () => {
      const layer = new Layer('bg', 5, {});
      expect(layer.layerName).toBe('bg');
      expect(layer.layerIndex).toBe(5);
    });

    it('isEventLayer 默认 false', () => {
      const layer = new Layer('render', 0, {});
      expect(layer.isEventLayer).toBe(false);
    });

    it('事件层标记 isEventLayer = true', () => {
      const layer = new Layer('evt', 99999, {}, true);
      expect(layer.isEventLayer).toBe(true);
    });
  });

  describe('DOM 样式', () => {
    it('渲染层 position:absolute, pointerEvents:none', () => {
      const layer = new Layer('render', 3, {});
      const el = layer.renderer.el;
      expect(el.style.position).toBe('absolute');
      expect(el.style.pointerEvents).toBe('none');
      expect(el.style.zIndex).toBe('3');
    });

    it('事件层不设置 pointerEvents:none', () => {
      const layer = new Layer('evt', 99999, {}, true);
      const el = layer.renderer.el;
      expect(el.style.position).toBe('absolute');
      expect(el.style.pointerEvents).not.toBe('none');
      expect(el.style.zIndex).toBe('99999');
    });
  });

  describe('getQueue() 层级渲染队列', () => {
    it('收集 type=3 的 Node', () => {
      const layer = new Layer('test', 0, {});
      const n1 = createNode('n1');
      const n2 = createNode('n2');
      layer.add(n1);
      layer.add(n2);
      const queue = layer.getQueue();
      expect(queue).toContain(n1);
      expect(queue).toContain(n2);
      expect(queue.length).toBe(2);
    });

    it('不收集 Group（type=2）', () => {
      const layer = new Layer('test', 0, {});
      const group = new Group();
      const node = createNode('n');
      layer.add(group);
      group.add(node);
      const queue = layer.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0]).toBe(node);
    });

    it('按 ez 排序', () => {
      const layer = new Layer('test', 0, {});
      const n1 = createNode('n1', 10);
      const n2 = createNode('n2', 5);
      const n3 = createNode('n3', 15);
      layer.add(n1);
      layer.add(n2);
      layer.add(n3);
      layer.update();
      const queue = layer.getQueue();
      expect(queue.map(n => n.name)).toEqual(['n2', 'n1', 'n3']);
    });
  });

  describe('sign() 是否需要重绘', () => {
    it('事件层始终返回 false', () => {
      const layer = new Layer('evt', 0, {}, true);
      layer.add(createNode('n'));
      expect(layer.sign()).toBe(false);
    });

    it('渲染层有脏节点时返回 true', () => {
      const layer = new Layer('render', 0, {});
      layer.add(createNode('n'));
      expect(layer.sign()).toBe(true);
    });
  });

  describe('clear / dispose', () => {
    it('clear 清空队列', () => {
      const layer = new Layer('test', 0, {});
      layer.add(createNode('n'));
      layer.getQueue();
      layer.clear();
      expect(layer.getQueue().length).toBe(0);
    });

    it('dispose 调用 renderer.dispose', () => {
      const layer = new Layer('test', 0, {});
      const spy = vi.spyOn(layer.renderer, 'dispose');
      layer.dispose();
      expect(spy).toHaveBeenCalled();
    });
  });
});

describe('Scene - 多层管理', () => {
  describe('registerLayer / getLayer / removeLayer', () => {
    it('注册并按 layerIndex 排序', () => {
      const scene = new Scene();
      const l1 = new Layer('bg', 10, {});
      const l2 = new Layer('fg', 5, {});
      scene.registerLayer(l1);
      scene.registerLayer(l2);
      expect(scene.layers.map(l => l.layerName)).toEqual(['fg', 'bg']);
    });

    it('getLayer 查找', () => {
      const scene = new Scene();
      const layer = new Layer('main', 0, {});
      scene.registerLayer(layer);
      expect(scene.getLayer('main')).toBe(layer);
      expect(scene.getLayer('none')).toBeUndefined();
    });

    it('removeLayer 移除', () => {
      const scene = new Scene();
      const layer = new Layer('temp', 0, {});
      scene.registerLayer(layer);
      scene.removeLayer('temp');
      expect(scene.getLayer('temp')).toBeUndefined();
      expect(scene.layers.length).toBe(0);
    });

    it('事件层不可移除', () => {
      const scene = new Scene();
      const evtLayer = new Layer('evt', 99999, {}, true);
      scene.registerLayer(evtLayer);
      scene.removeLayer('evt');
      expect(scene.getLayer('evt')).toBe(evtLayer);
    });
  });

  describe('add() 路由到默认层', () => {
    it('有 default 层时 add 路由到 default 层', () => {
      const scene = new Scene();
      const defaultLayer = new Layer('default', 0, {});
      scene.registerLayer(defaultLayer);
      const node = createNode('n');
      scene.add(node);
      // node 应该在 defaultLayer 的 children 中
      expect(defaultLayer.children).toContain(node);
    });

    it('无 default 层时 add 退回 Scene children', () => {
      const scene = new Scene();
      const node = createNode('n');
      scene.add(node);
      expect(scene.children).toContain(node);
    });
  });

  describe('getQueue() 多层收集', () => {
    it('合并各渲染层的队列', () => {
      const scene = new Scene();
      const l1 = new Layer('bg', 0, {});
      const l2 = new Layer('fg', 1, {});
      const evtLayer = new Layer('evt', 99999, {}, true);
      scene.registerLayer(l1);
      scene.registerLayer(l2);
      scene.registerLayer(evtLayer);

      const n1 = createNode('n1', 5);
      const n2 = createNode('n2', 10);
      l1.add(n1);
      l2.add(n2);
      scene.update();

      const queue = scene.getQueue();
      expect(queue.length).toBe(2);
      expect(queue.map(n => n.name)).toEqual(['n1', 'n2']);
    });

    it('事件层不加入队列', () => {
      const scene = new Scene();
      const evtLayer = new Layer('evt', 99999, {}, true);
      scene.registerLayer(evtLayer);
      evtLayer.add(createNode('ghost'));
      scene.update();
      // 事件层的节点不应出现在 scene 队列中（从层收集）
      const queue = scene.getQueue();
      expect(queue.length).toBe(0);
    });
  });

  describe('pick() 跨层命中', () => {
    it('从高 layerIndex 向下搜索', () => {
      const scene = new Scene();
      const low = new Layer('bg', 0, {});
      const high = new Layer('fg', 10, {});
      scene.registerLayer(low);
      scene.registerLayer(high);

      const nLow = Node.create('rect', {fill: 'red'});
      nLow.setName('low');
      nLow.shape.from(0, 0, 100, 100);
      low.add(nLow);

      const nHigh = Node.create('rect', {fill: 'blue'});
      nHigh.setName('high');
      nHigh.shape.from(0, 0, 100, 100);
      high.add(nHigh);

      scene.update();
      // 确保 layer 队列已构建
      low.getQueue();
      high.getQueue();

      const hit = scene.pick([50, 50]);
      expect(hit!.name).toBe('high');
    });

    it('高层未命中则穿透到低层', () => {
      const scene = new Scene();
      const low = new Layer('bg', 0, {});
      const high = new Layer('fg', 10, {});
      scene.registerLayer(low);
      scene.registerLayer(high);

      const nLow = Node.create('rect', {fill: 'red'});
      nLow.setName('low');
      nLow.shape.from(0, 0, 100, 100);
      low.add(nLow);

      // 高层有节点但不在点击位置
      const nHigh = Node.create('rect', {fill: 'blue'});
      nHigh.setName('high');
      nHigh.shape.from(200, 200, 50, 50);
      high.add(nHigh);

      scene.update();
      low.getQueue();
      high.getQueue();

      const hit = scene.pick([50, 50]);
      expect(hit!.name).toBe('low');
    });

    it('跳过事件层', () => {
      const scene = new Scene();
      const render = new Layer('main', 0, {});
      const evt = new Layer('evt', 99999, {}, true);
      scene.registerLayer(render);
      scene.registerLayer(evt);

      // 事件层也加了节点（虽然现实中不会），应被跳过
      const nEvt = Node.create('rect', {fill: 'red'});
      nEvt.shape.from(0, 0, 100, 100);
      evt.add(nEvt);

      // 渲染层有节点
      const nRender = Node.create('rect', {fill: 'blue'});
      nRender.setName('render');
      nRender.shape.from(0, 0, 100, 100);
      render.add(nRender);

      scene.update();
      render.getQueue();
      evt.getQueue();

      const hit = scene.pick([50, 50]);
      expect(hit!.name).toBe('render');
    });

    it('所有层都未命中返回 undefined', () => {
      const scene = new Scene();
      const layer = new Layer('main', 0, {});
      scene.registerLayer(layer);

      const node = Node.create('rect', {fill: 'red'});
      node.shape.from(0, 0, 10, 10);
      layer.add(node);

      scene.update();
      layer.getQueue();

      const hit = scene.pick([999, 999]);
      expect(hit).toBeUndefined();
    });
  });
});
