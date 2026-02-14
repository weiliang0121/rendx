import {describe, it, expect, vi, beforeEach} from 'vitest';

// Mock rendx-canvas 和 rendx-svg 避免 OffscreenCanvas 依赖
vi.mock('rendx-canvas', () => ({
  CanvasRenderer: class {
    el = document.createElement('canvas');
    resize() {}
    dispose() {}
    clear() {}
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

import {App, Group, Node} from 'rendx-engine';
import {elementPlugin} from '../src/element';
import {rectRenderer, circleRenderer, roundRenderer} from '../src/defaults';
import {blueprintRenderer, renderBlueprint, calcBlueprintHeight, generateBlueprintPorts, createListBlueprint, createListNodeRenderer} from '../src/blueprint';

import type {ElementPlugin} from '../src/element';
import type {ElementNodeData} from '../src/types';
import type {NodeBlueprint} from '../src/blueprint';

describe('Element Plugin - 元素管理插件', () => {
  let container: HTMLDivElement;
  let app: App;
  let element: ElementPlugin;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    app = new App({width: 800, height: 600});
    app.mount(container);
    element = elementPlugin();
    app.use(element);

    // 手动注册类型（不再内置）
    element.registerType('rect', rectRenderer);
    element.registerType('circle', circleRenderer);
    element.registerType('round', roundRenderer);

    return () => {
      app.dispose();
      container.remove();
    };
  });

  // ========================
  // addNode
  // ========================
  describe('addNode - 添加元素', () => {
    it('添加 rect 类型元素', () => {
      const group = element.addNode({
        id: 'n1',
        type: 'rect',
        x: 100,
        y: 200,
        width: 150,
        height: 80,
      });
      expect(group).toBeInstanceOf(Group);
      expect(group.name).toBe('n1');
      expect(element.count).toBe(1);
    });

    it('添加 circle 类型元素', () => {
      const group = element.addNode({
        id: 'c1',
        type: 'circle',
        x: 300,
        y: 300,
        width: 60,
        height: 60,
      });
      expect(group).toBeInstanceOf(Group);
      expect(element.hasNode('c1')).toBe(true);
    });

    it('添加 round 类型元素', () => {
      const group = element.addNode({
        id: 'r1',
        type: 'round',
        x: 50,
        y: 50,
        width: 120,
        height: 60,
      });
      expect(group).toBeInstanceOf(Group);
    });

    it('添加时设置 label', () => {
      const group = element.addNode({
        id: 'lbl',
        type: 'rect',
        x: 0,
        y: 0,
        label: '测试节点',
      });
      const label = group.find('__label__');
      expect(label).toBeDefined();
    });

    it('添加时设置 style', () => {
      element.addNode({
        id: 's1',
        type: 'rect',
        x: 0,
        y: 0,
        style: {fill: '#ff0000', strokeWidth: 3},
      });
      const data = element.getNode('s1');
      expect(data?.style?.fill).toBe('#ff0000');
    });

    it('添加时设置 ports', () => {
      element.addNode({
        id: 'p1',
        type: 'rect',
        x: 100,
        y: 100,
        width: 200,
        height: 80,
        ports: [
          {id: 'in', position: 'left'},
          {id: 'out', position: 'right'},
        ],
      });
      const ports = element.getPortPositions('p1');
      expect(ports).not.toBeNull();
      expect(ports!['in']).toEqual([100, 140]); // x, y + height * 0.5
      expect(ports!['out']).toEqual([300, 140]); // x + width, y + height * 0.5
    });

    it('重复 id 抛错', () => {
      element.addNode({id: 'dup', type: 'rect', x: 0, y: 0});
      expect(() => element.addNode({id: 'dup', type: 'rect', x: 0, y: 0})).toThrowError(/already exists/);
    });

    it('未注册类型抛错', () => {
      expect(() => element.addNode({id: 'bad', type: 'unknown-type', x: 0, y: 0})).toThrowError(/Unknown element type/);
    });

    it('批量添加 addNodes', () => {
      const groups = element.addNodes([
        {id: 'a', type: 'rect', x: 0, y: 0},
        {id: 'b', type: 'circle', x: 100, y: 100},
      ]);
      expect(groups).toHaveLength(2);
      expect(element.count).toBe(2);
    });

    it('添加后 bus 发出 element:added 信号', () => {
      const handler = vi.fn();
      app.bus.on('element:added', handler);
      element.addNode({id: 'sig', type: 'rect', x: 0, y: 0});
      expect(handler).toHaveBeenCalledOnce();
    });

    it('添加后中心化 state 同步更新', async () => {
      element.addNode({id: 'st1', type: 'rect', x: 10, y: 20});
      const nodes = app.getState<Record<string, ElementNodeData>>('element:nodes');
      expect(nodes).toBeDefined();
      expect(nodes!['st1']).toBeDefined();
      expect(nodes!['st1'].x).toBe(10);
    });

    it('RenderResult 自动填充 height 和 ports', () => {
      element.registerType('auto-meta', () => {
        const g = new Group();
        const body = Node.create('rect', {fill: '#fff'});
        body.shape.from(0, 0, 100, 200);
        g.add(body);
        return {
          group: g,
          height: 200,
          ports: [
            {id: 'p1', position: 'left' as const, offset: 0.25},
            {id: 'p2', position: 'right' as const, offset: 0.75},
          ],
        };
      });

      element.addNode({id: 'am1', type: 'auto-meta', x: 0, y: 0, width: 100});
      const data = element.getNode('am1');
      expect(data?.height).toBe(200);
      expect(data?.ports).toHaveLength(2);
      expect(data?.ports![0].id).toBe('p1');
    });
  });

  // ========================
  // removeNode
  // ========================
  describe('removeNode - 移除元素', () => {
    it('移除已有元素返回 true', () => {
      element.addNode({id: 'rm1', type: 'rect', x: 0, y: 0});
      expect(element.removeNode('rm1')).toBe(true);
      expect(element.count).toBe(0);
      expect(element.hasNode('rm1')).toBe(false);
    });

    it('移除不存在的元素返回 false', () => {
      expect(element.removeNode('nonexistent')).toBe(false);
    });

    it('批量移除 removeNodes', () => {
      element.addNodes([
        {id: 'a', type: 'rect', x: 0, y: 0},
        {id: 'b', type: 'rect', x: 100, y: 0},
        {id: 'c', type: 'rect', x: 200, y: 0},
      ]);
      const count = element.removeNodes(['a', 'c', 'missing']);
      expect(count).toBe(2);
      expect(element.count).toBe(1);
    });

    it('移除后 bus 发出 element:removed 信号', () => {
      element.addNode({id: 'sig-rm', type: 'rect', x: 0, y: 0});
      const handler = vi.fn();
      app.bus.on('element:removed', handler);
      element.removeNode('sig-rm');
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  // ========================
  // updateNode
  // ========================
  describe('updateNode - 更新元素', () => {
    it('更新位置', () => {
      element.addNode({id: 'mv', type: 'rect', x: 0, y: 0});
      element.updateNode('mv', {x: 50, y: 60});
      const data = element.getNode('mv');
      expect(data?.x).toBe(50);
      expect(data?.y).toBe(60);
    });

    it('更新尺寸触发重建', () => {
      element.addNode({id: 'sz', type: 'rect', x: 0, y: 0, width: 100, height: 60});
      element.updateNode('sz', {width: 200, height: 100});
      const data = element.getNode('sz');
      expect(data?.width).toBe(200);
      expect(data?.height).toBe(100);
    });

    it('更新 label', () => {
      element.addNode({id: 'lb', type: 'rect', x: 0, y: 0, label: 'old'});
      element.updateNode('lb', {label: 'new'});
      const data = element.getNode('lb');
      expect(data?.label).toBe('new');
    });

    it('更新类型触发重建', () => {
      element.addNode({id: 'tc', type: 'rect', x: 0, y: 0});
      element.updateNode('tc', {type: 'circle', width: 60, height: 60});
      const data = element.getNode('tc');
      expect(data?.type).toBe('circle');
    });

    it('更新不存在的元素抛错', () => {
      expect(() => element.updateNode('bogus', {x: 0})).toThrowError(/not found/);
    });

    it('有 updater 时走就地更新', () => {
      const updaterFn = vi.fn();
      element.registerType(
        'updatable',
        data => {
          const g = new Group();
          const body = Node.create('rect', {fill: '#000'});
          body.shape.from(0, 0, data.width ?? 100, data.height ?? 60);
          g.add(body);
          return g;
        },
        updaterFn,
      );

      element.addNode({id: 'u1', type: 'updatable', x: 0, y: 0});
      element.updateNode('u1', {label: 'updated'});
      expect(updaterFn).toHaveBeenCalledOnce();
    });

    it('仅位置变化不触发 updater', () => {
      const updaterFn = vi.fn();
      element.registerType(
        'pos-only',
        data => {
          const g = new Group();
          const body = Node.create('rect', {fill: '#000'});
          body.shape.from(0, 0, data.width ?? 100, data.height ?? 60);
          g.add(body);
          return g;
        },
        updaterFn,
      );

      element.addNode({id: 'po', type: 'pos-only', x: 0, y: 0});
      element.updateNode('po', {x: 50, y: 50});
      expect(updaterFn).not.toHaveBeenCalled();
    });

    it('data 变更触发视觉重建', () => {
      const renderFn = vi.fn(() => {
        const g = new Group();
        const body = Node.create('rect', {fill: '#000'});
        body.shape.from(0, 0, 100, 60);
        g.add(body);
        return g;
      });
      element.registerType('data-visual', renderFn);

      element.addNode({id: 'dv', type: 'data-visual', x: 0, y: 0, data: {foo: 1}});
      expect(renderFn).toHaveBeenCalledOnce();

      element.updateNode('dv', {data: {foo: 2}});
      expect(renderFn).toHaveBeenCalledTimes(2);
    });

    it('id 不可通过 updateNode 变更', () => {
      element.addNode({id: 'immutable-id', type: 'rect', x: 0, y: 0});
      element.updateNode('immutable-id', {id: 'new-id'} as Partial<ElementNodeData>);
      expect(element.hasNode('immutable-id')).toBe(true);
      expect(element.hasNode('new-id')).toBe(false);
    });

    it('更新后 bus 发出 element:updated 信号', () => {
      element.addNode({id: 'sig-up', type: 'rect', x: 0, y: 0});
      const handler = vi.fn();
      app.bus.on('element:updated', handler);
      element.updateNode('sig-up', {x: 10});
      expect(handler).toHaveBeenCalledOnce();
    });

    it('RenderResult 在更新重建时也生效', () => {
      element.registerType('auto-rebuild', data => {
        const g = new Group();
        const body = Node.create('rect', {fill: '#fff'});
        const h = ((data.data?.count as number) ?? 1) * 30;
        body.shape.from(0, 0, 100, h);
        g.add(body);
        return {
          group: g,
          height: h,
          ports: [{id: 'out', position: 'right' as const, offset: 0.5}],
        };
      });

      element.addNode({id: 'ar', type: 'auto-rebuild', x: 0, y: 0, data: {count: 2}});
      expect(element.getNode('ar')?.height).toBe(60);

      element.updateNode('ar', {data: {count: 4}});
      expect(element.getNode('ar')?.height).toBe(120);
      expect(element.getNode('ar')?.ports).toHaveLength(1);
    });
  });

  // ========================
  // Query
  // ========================
  describe('Query - 查询', () => {
    beforeEach(() => {
      element.addNodes([
        {id: 'q1', type: 'rect', x: 0, y: 0, width: 100, height: 60},
        {id: 'q2', type: 'circle', x: 200, y: 200, width: 80, height: 80},
        {id: 'q3', type: 'rect', x: 400, y: 0, width: 150, height: 90},
      ]);
    });

    it('getNode 返回数据副本', () => {
      const data = element.getNode('q1');
      expect(data?.id).toBe('q1');
      data!.x = 999;
      expect(element.getNode('q1')?.x).toBe(0);
    });

    it('getNode 不存在返回 undefined', () => {
      expect(element.getNode('nonexistent')).toBeUndefined();
    });

    it('getNodeGroup 返回 Group 实例', () => {
      const group = element.getNodeGroup('q1');
      expect(group).toBeInstanceOf(Group);
    });

    it('getNodeIds 返回所有 id', () => {
      const ids = element.getNodeIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('q1');
      expect(ids).toContain('q2');
      expect(ids).toContain('q3');
    });

    it('getAllNodes 返回所有数据', () => {
      const all = element.getAllNodes();
      expect(all).toHaveLength(3);
    });

    it('getNodesByType 按类型筛选', () => {
      const rects = element.getNodesByType('rect');
      expect(rects).toHaveLength(2);
      const circles = element.getNodesByType('circle');
      expect(circles).toHaveLength(1);
    });

    it('count 属性', () => {
      expect(element.count).toBe(3);
    });

    it('hasNode', () => {
      expect(element.hasNode('q1')).toBe(true);
      expect(element.hasNode('missing')).toBe(false);
    });
  });

  // ========================
  // Port
  // ========================
  describe('Port - 端口计算', () => {
    beforeEach(() => {
      element.addNode({
        id: 'port-node',
        type: 'rect',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        ports: [
          {id: 'top', position: 'top'},
          {id: 'bottom', position: 'bottom'},
          {id: 'left', position: 'left'},
          {id: 'right', position: 'right'},
          {id: 'top-left', position: 'top', offset: 0.25},
        ],
      });
    });

    it('top 端口坐标（默认 offset=0.5 居中）', () => {
      expect(element.getPortPosition('port-node', 'top')).toEqual([200, 100]);
    });

    it('bottom 端口坐标', () => {
      expect(element.getPortPosition('port-node', 'bottom')).toEqual([200, 200]);
    });

    it('left 端口坐标', () => {
      expect(element.getPortPosition('port-node', 'left')).toEqual([100, 150]);
    });

    it('right 端口坐标', () => {
      expect(element.getPortPosition('port-node', 'right')).toEqual([300, 150]);
    });

    it('自定义 offset', () => {
      expect(element.getPortPosition('port-node', 'top-left')).toEqual([150, 100]);
    });

    it('不存在的元素返回 null', () => {
      expect(element.getPortPosition('bogus', 'top')).toBeNull();
    });

    it('不存在的端口返回 null', () => {
      expect(element.getPortPosition('port-node', 'bogus-port')).toBeNull();
    });

    it('getPortPositions 返回所有端口', () => {
      const ports = element.getPortPositions('port-node');
      expect(ports).not.toBeNull();
      expect(Object.keys(ports!)).toHaveLength(5);
    });
  });

  // ========================
  // Custom Type
  // ========================
  describe('registerType - 自定义类型', () => {
    it('注册并使用自定义类型', () => {
      element.registerType('diamond', data => {
        const g = new Group();
        const body = Node.create('polygon', {fill: '#ffd700'});
        const w = data.width ?? 100;
        const h = data.height ?? 60;
        body.shape.from([
          [w / 2, 0],
          [w, h / 2],
          [w / 2, h],
          [0, h / 2],
        ]);
        g.add(body);
        return g;
      });

      const group = element.addNode({
        id: 'd1',
        type: 'diamond',
        x: 100,
        y: 100,
        width: 120,
        height: 80,
      });
      expect(group).toBeInstanceOf(Group);
      expect(element.getNode('d1')?.type).toBe('diamond');
    });

    it('自定义类型可覆盖已注册类型', () => {
      const customRenderer = vi.fn(() => {
        const g = new Group();
        const body = Node.create('rect', {fill: '#custom'});
        body.shape.from(0, 0, 100, 60);
        g.add(body);
        return g;
      });
      element.registerType('rect', customRenderer);
      element.addNode({id: 'custom-rect', type: 'rect', x: 0, y: 0});
      expect(customRenderer).toHaveBeenCalledOnce();
    });
  });

  // ========================
  // Persistence
  // ========================
  describe('serialize / deserialize', () => {
    it('序列化所有元素数据', () => {
      element.addNodes([
        {id: 'a', type: 'rect', x: 10, y: 20},
        {id: 'b', type: 'circle', x: 100, y: 200},
      ]);

      const json = element.serialize();
      const nodes = json.nodes as Record<string, ElementNodeData>;
      expect(Object.keys(nodes)).toHaveLength(2);
      expect(nodes['a'].x).toBe(10);
      expect(nodes['b'].type).toBe('circle');
    });

    it('从序列化数据恢复', () => {
      element.addNode({id: 'orig', type: 'rect', x: 50, y: 50});

      const json = element.serialize();

      element.deserialize(json);
      expect(element.count).toBe(1);
      expect(element.getNode('orig')?.x).toBe(50);
    });

    it('反序列化替换现有元素', () => {
      element.addNode({id: 'old', type: 'rect', x: 0, y: 0});

      element.deserialize({
        nodes: {
          new1: {id: 'new1', type: 'rect', x: 100, y: 100},
          new2: {id: 'new2', type: 'circle', x: 200, y: 200, width: 60, height: 60},
        },
      });

      expect(element.hasNode('old')).toBe(false);
      expect(element.count).toBe(2);
      expect(element.hasNode('new1')).toBe(true);
      expect(element.hasNode('new2')).toBe(true);
    });
  });

  // ========================
  // dispose
  // ========================
  describe('dispose', () => {
    it('清理所有元素和渲染器', () => {
      element.addNodes([
        {id: 'a', type: 'rect', x: 0, y: 0},
        {id: 'b', type: 'rect', x: 100, y: 0},
      ]);
      expect(element.count).toBe(2);
      app.dispose();
      expect(element.count).toBe(0);
    });
  });

  // ========================
  // Integration
  // ========================
  describe('Integration - 集成场景', () => {
    it('element 状态通过 bus 通知其他插件', async () => {
      let notified = false;
      app.bus.on('state:element:nodes', () => {
        notified = true;
      });

      element.addNode({id: 'int1', type: 'rect', x: 0, y: 0});
      await Promise.resolve();
      expect(notified).toBe(true);
    });

    it('完整 CRUD 流程', () => {
      element.addNode({id: 'crud', type: 'rect', x: 0, y: 0, width: 100, height: 60, label: 'Start'});
      expect(element.count).toBe(1);
      expect(element.getNode('crud')?.label).toBe('Start');

      element.updateNode('crud', {x: 50, label: 'Updated'});
      expect(element.getNode('crud')?.label).toBe('Updated');
      expect(element.getNode('crud')?.x).toBe(50);

      element.removeNode('crud');
      expect(element.count).toBe(0);
    });

    it('多类型混合场景', () => {
      element.addNodes([
        {id: 'r', type: 'rect', x: 0, y: 0, width: 100, height: 60},
        {id: 'c', type: 'circle', x: 200, y: 100, width: 80, height: 80},
        {id: 'ro', type: 'round', x: 400, y: 0, width: 120, height: 60},
      ]);

      expect(element.getNodesByType('rect')).toHaveLength(1);
      expect(element.getNodesByType('circle')).toHaveLength(1);
      expect(element.getNodesByType('round')).toHaveLength(1);
      expect(element.count).toBe(3);
    });

    it('端口坐标跟随元素位置更新', () => {
      element.addNode({
        id: 'track',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        ports: [{id: 'right', position: 'right'}],
      });

      expect(element.getPortPosition('track', 'right')).toEqual([100, 25]);

      element.updateNode('track', {x: 200, y: 100});
      expect(element.getPortPosition('track', 'right')).toEqual([300, 125]);
    });
  });

  // ========================
  // Blueprint 声明式节点
  // ========================
  describe('Blueprint - 声明式节点系统', () => {
    beforeEach(() => {
      element.registerType('blueprint', blueprintRenderer);
    });

    it('calcBlueprintHeight 计算总高度', () => {
      const bp: NodeBlueprint = {
        sections: [{type: 'header', height: 40}, {type: 'divider'}, {type: 'row', id: 'r1'}, {type: 'divider'}, {type: 'row', id: 'r2', height: 50}, {type: 'spacer', height: 20}],
      };
      expect(calcBlueprintHeight(bp)).toBe(140);
    });

    it('generateBlueprintPorts 生成端口定义', () => {
      const bp: NodeBlueprint = {
        sections: [{type: 'header', height: 30}, {type: 'divider'}, {type: 'row', id: 'a', height: 30, ports: {left: 1, right: 2}}, {type: 'row', id: 'b', height: 30, ports: {left: 0, right: 1}}],
      };
      const ports = generateBlueprintPorts(bp);
      expect(ports).toHaveLength(4);

      const ids = ports.map(p => p.id);
      expect(ids).toContain('a:in:0');
      expect(ids).toContain('a:out:0');
      expect(ids).toContain('a:out:1');
      expect(ids).toContain('b:out:0');

      const aIn = ports.find(p => p.id === 'a:in:0')!;
      expect(aIn.offset).toBeCloseTo(45 / 90);
    });

    it('renderBlueprint 返回 RenderResult', () => {
      const bp: NodeBlueprint = {
        sections: [{type: 'header', label: 'Test', height: 30}, {type: 'divider'}, {type: 'row', id: 'r1', label: 'Row 1', ports: {left: 1, right: 1}}],
      };
      const data: ElementNodeData = {id: 't', type: 'blueprint', x: 0, y: 0, width: 200};
      const result = renderBlueprint(data, bp);

      expect(result.group).toBeInstanceOf(Group);
      expect(result.height).toBe(60);
      expect(result.ports).toHaveLength(2);
    });

    it('blueprintRenderer 从 data.data.blueprint 读取蓝图并自动填充 height/ports', () => {
      element.addNode({
        id: 'bp1',
        type: 'blueprint',
        x: 0,
        y: 0,
        width: 200,
        data: {
          blueprint: {
            sections: [{type: 'header', label: 'MyNode', fill: '#6e8efb'}, {type: 'divider'}, {type: 'row', id: 'a', label: 'input', ports: {left: 1}}, {type: 'row', id: 'b', label: 'output', ports: {right: 1}}],
          },
        },
      });

      const data = element.getNode('bp1');
      expect(data?.height).toBe(90);
      expect(data?.ports).toHaveLength(2);
    });

    it('blueprintRenderer 无蓝图时回退为矩形', () => {
      const group = element.addNode({
        id: 'fallback',
        type: 'blueprint',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        data: {},
      });

      expect(group).toBeInstanceOf(Group);
      expect(group.find('__body__')).toBeDefined();
    });

    it('蓝图节点渲染结构正确', () => {
      const group = element.addNode({
        id: 'struct',
        type: 'blueprint',
        x: 0,
        y: 0,
        width: 200,
        data: {
          blueprint: {
            sections: [{type: 'header', label: 'Title', fill: '#ff6600'}, {type: 'divider'}, {type: 'row', id: 'r1', label: 'Row 1', ports: {left: 1, right: 1}}, {type: 'divider'}, {type: 'row', id: 'r2', label: 'Row 2', ports: {left: 1}}],
            portColor: '#ff6600',
          },
        },
      });

      expect(group.find('__body__')).toBeDefined();
      expect(group.find('__header-bg-0__')).toBeDefined();
      expect(group.find('__header-text-0__')).toBeDefined();
      expect(group.find('__divider-1__')).toBeDefined();
      expect(group.find('__divider-3__')).toBeDefined();
      expect(group.find('__row-r1-label__')).toBeDefined();
      expect(group.find('__row-r2-label__')).toBeDefined();
      expect(group.find('__row-r1-in-0__')).toBeDefined();
      expect(group.find('__row-r1-out-0__')).toBeDefined();
      expect(group.find('__row-r2-in-0__')).toBeDefined();
    });

    it('带 cells 的行渲染', () => {
      const group = element.addNode({
        id: 'cells',
        type: 'blueprint',
        x: 0,
        y: 0,
        width: 200,
        data: {
          blueprint: {
            sections: [
              {
                type: 'row',
                id: 'r1',
                cells: [
                  {type: 'text', content: 'hello'},
                  {type: 'spacer', width: 10},
                  {type: 'text', content: 'world'},
                ],
              },
            ],
          },
        },
      });

      expect(group.find('__row-r1-cell-0__')).toBeDefined();
      expect(group.find('__row-r1-cell-2__')).toBeDefined();
    });

    it('端口坐标对齐到行中心', () => {
      element.addNode({
        id: 'port-test',
        type: 'blueprint',
        x: 100,
        y: 100,
        width: 200,
        data: {
          blueprint: {
            sections: [{type: 'header', height: 30}, {type: 'divider'}, {type: 'row', id: 'r1', height: 30, ports: {left: 1}}, {type: 'row', id: 'r2', height: 30, ports: {right: 1}}],
          },
        },
      });

      const p1 = element.getPortPosition('port-test', 'r1:in:0');
      expect(p1).not.toBeNull();
      expect(p1![0]).toBe(100);
      expect(p1![1]).toBe(145);

      const p2 = element.getPortPosition('port-test', 'r2:out:0');
      expect(p2).not.toBeNull();
      expect(p2![0]).toBe(300);
      expect(p2![1]).toBe(175);
    });

    it('update data 触发蓝图重建', () => {
      element.addNode({
        id: 'bp-update',
        type: 'blueprint',
        x: 0,
        y: 0,
        width: 200,
        data: {
          blueprint: {
            sections: [{type: 'row', id: 'r1', label: 'only one', ports: {left: 1}}],
          },
        },
      });

      expect(element.getNode('bp-update')?.height).toBe(30);
      expect(element.getNode('bp-update')?.ports).toHaveLength(1);

      element.updateNode('bp-update', {
        data: {
          blueprint: {
            sections: [{type: 'header', label: 'Title'}, {type: 'divider'}, {type: 'row', id: 'r1', label: 'Row 1', ports: {left: 1}}, {type: 'row', id: 'r2', label: 'Row 2', ports: {right: 1}}],
          },
        },
      });

      const updated = element.getNode('bp-update');
      expect(updated?.height).toBe(90);
      expect(updated?.ports).toHaveLength(2);
    });
  });

  // ========================
  // createListBlueprint 工厂
  // ========================
  describe('createListBlueprint - 列表蓝图工厂', () => {
    it('生成正确的蓝图结构', () => {
      const bp = createListBlueprint('QueueControl', {
        rows: [
          {id: 'in1', label: 'input1'},
          {id: 'in2', label: 'input2'},
        ],
      });

      expect(bp.sections).toBeDefined();
      expect(bp.sections).toHaveLength(5);
      expect(bp.sections[0].type).toBe('header');
      expect(bp.sections[1].type).toBe('divider');
      expect(bp.sections[2].type).toBe('row');
    });

    it('高度和端口自动计算', () => {
      const bp = createListBlueprint('Test', {
        rows: [
          {id: 'a', label: 'A', inputCount: 1, outputCount: 1},
          {id: 'b', label: 'B', inputCount: 0, outputCount: 2},
        ],
      });

      expect(calcBlueprintHeight(bp)).toBe(90);

      const ports = generateBlueprintPorts(bp);
      expect(ports).toHaveLength(4);
    });

    it('无标题时不添加 header', () => {
      const bp = createListBlueprint(undefined, {
        rows: [{id: 'r1', label: 'Row'}],
      });

      expect(bp.sections[0].type).toBe('row');
      expect(calcBlueprintHeight(bp)).toBe(30);
    });

    it('自定义尺寸参数', () => {
      const bp = createListBlueprint('Custom', {
        rows: [{id: 'r1', label: 'Row'}],
        headerHeight: 40,
        rowHeight: 36,
        portSize: 10,
        portColor: '#ff0000',
        cornerRadius: 8,
      });

      expect(bp.portSize).toBe(10);
      expect(bp.portColor).toBe('#ff0000');
      expect(bp.cornerRadius).toBe(8);
      expect(calcBlueprintHeight(bp)).toBe(76);
    });
  });

  // ========================
  // createListNodeRenderer 便捷渲染器
  // ========================
  describe('createListNodeRenderer - 列表节点渲染器', () => {
    beforeEach(() => {
      element.registerType('list-node', createListNodeRenderer());
    });

    it('创建带 3 行的 list-node', () => {
      const group = element.addNode({
        id: 'qc1',
        type: 'list-node',
        x: 100,
        y: 50,
        width: 240,
        label: 'QueueControl',
        data: {
          rows: [
            {id: 'in1', label: 'input1'},
            {id: 'in2', label: 'input2'},
            {id: 'in3', label: 'input3'},
          ],
        },
      });

      expect(group).toBeInstanceOf(Group);
      expect(element.hasNode('qc1')).toBe(true);

      const data = element.getNode('qc1');
      expect(data?.height).toBe(120);
    });

    it('自动生成端口', () => {
      element.addNode({
        id: 'auto-port',
        type: 'list-node',
        x: 0,
        y: 0,
        width: 200,
        label: 'AutoPorts',
        data: {
          rows: [
            {id: 'a', label: 'Alpha'},
            {id: 'b', label: 'Beta'},
          ],
        },
      });

      const data = element.getNode('auto-port');
      expect(data?.ports).toBeDefined();
      expect(data!.ports).toHaveLength(4);

      const portIds = data!.ports!.map(p => p.id);
      expect(portIds).toContain('a:in:0');
      expect(portIds).toContain('a:out:0');
      expect(portIds).toContain('b:in:0');
      expect(portIds).toContain('b:out:0');
    });

    it('端口坐标对齐到行中心', () => {
      element.addNode({
        id: 'port-align',
        type: 'list-node',
        x: 100,
        y: 100,
        width: 200,
        label: 'Test',
        data: {
          rows: [
            {id: 'r1', label: 'Row 1'},
            {id: 'r2', label: 'Row 2'},
          ],
          headerHeight: 30,
          rowHeight: 30,
        },
      });

      const p1 = element.getPortPosition('port-align', 'r1:in:0');
      expect(p1).not.toBeNull();
      expect(p1![0]).toBe(100);
      expect(p1![1]).toBe(145);

      const p2 = element.getPortPosition('port-align', 'r2:out:0');
      expect(p2).not.toBeNull();
      expect(p2![0]).toBe(300);
      expect(p2![1]).toBe(175);
    });

    it('行可配置多个端口', () => {
      element.addNode({
        id: 'multi-port',
        type: 'list-node',
        x: 0,
        y: 0,
        width: 200,
        label: 'Multi',
        data: {
          rows: [{id: 'r1', label: 'Row', inputCount: 3, outputCount: 2}],
        },
      });

      const data = element.getNode('multi-port');
      expect(data?.ports).toHaveLength(5);
    });

    it('行 inputCount=0 无左侧端口', () => {
      element.addNode({
        id: 'no-input',
        type: 'list-node',
        x: 0,
        y: 0,
        width: 200,
        label: 'NoInput',
        data: {
          rows: [{id: 'r1', label: 'Output Only', inputCount: 0, outputCount: 1}],
        },
      });

      const data = element.getNode('no-input');
      expect(data?.ports).toHaveLength(1);
      expect(data!.ports![0].id).toBe('r1:out:0');
      expect(data!.ports![0].position).toBe('right');
    });

    it('渲染结构正确', () => {
      const group = element.addNode({
        id: 'structure',
        type: 'list-node',
        x: 0,
        y: 0,
        width: 200,
        label: 'TestNode',
        data: {
          rows: [
            {id: 'r1', label: 'Row 1'},
            {id: 'r2', label: 'Row 2'},
          ],
        },
      });

      expect(group.find('__body__')).toBeDefined();
      expect(group.find('__header-text-0__')).toBeDefined();
      expect(group.find('__row-r1-label__')).toBeDefined();
      expect(group.find('__row-r2-label__')).toBeDefined();
      expect(group.find('__row-r1-in-0__')).toBeDefined();
      expect(group.find('__row-r1-out-0__')).toBeDefined();
    });

    it('update data 后重建', () => {
      element.addNode({
        id: 'update-list',
        type: 'list-node',
        x: 0,
        y: 0,
        width: 200,
        label: 'Before',
        data: {
          rows: [{id: 'r1', label: 'Row 1'}],
        },
      });

      expect(element.getNode('update-list')?.ports).toHaveLength(2);

      element.updateNode('update-list', {
        label: 'After',
        data: {
          rows: [
            {id: 'r1', label: 'Row 1'},
            {id: 'r2', label: 'Row 2'},
            {id: 'r3', label: 'Row 3'},
          ],
        },
      });

      const data = element.getNode('update-list');
      expect(data?.label).toBe('After');
      expect(data?.height).toBe(120);
      expect(data?.ports).toHaveLength(6);
    });

    it('QueueControl 完整场景', () => {
      element.addNode({
        id: 'queue-ctrl',
        type: 'list-node',
        x: 50,
        y: 30,
        width: 220,
        label: 'QueueControl',
        style: {fill: '#ffffff', stroke: '#6e8efb'},
        data: {
          rows: [
            {id: 'in1', label: 'input1', inputCount: 1, outputCount: 1},
            {id: 'in2', label: 'input2', inputCount: 1, outputCount: 1},
            {id: 'in3', label: 'input3', inputCount: 1, outputCount: 1},
          ],
        },
      });

      const data = element.getNode('queue-ctrl');
      expect(data).toBeDefined();
      expect(data!.height).toBe(120);
      expect(data!.ports).toHaveLength(6);

      const leftIn1 = element.getPortPosition('queue-ctrl', 'in1:in:0');
      expect(leftIn1).not.toBeNull();
      expect(leftIn1![0]).toBe(50);

      const rightOut1 = element.getPortPosition('queue-ctrl', 'in1:out:0');
      expect(rightOut1).not.toBeNull();
      expect(rightOut1![0]).toBe(270);
    });
  });
});
