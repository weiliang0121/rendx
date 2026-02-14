import {describe, it, expect, vi, beforeEach} from 'vitest';

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
import {createElement} from '../src/create';
import {graphPlugin} from '../src/graph';

import type {GraphPlugin} from '../src/graph';
import type {Element} from '../src/types';

// ── 测试用的 Element 类型定义 ──

interface CardData {
  title: string;
  color?: string;
}

const Card = createElement<CardData>((ctx, data) => {
  const bg = Node.create('rect', {fill: data.color ?? '#ffffff', stroke: '#333'});
  bg.shape.from(0, 0, ctx.width, ctx.height);
  bg.name = '__bg__';
  ctx.group.add(bg);

  const label = Node.create('text', {fill: '#333', textAnchor: 'middle', dominantBaseline: 'central'});
  label.shape.from(data.title, ctx.width / 2, ctx.height / 2);
  label.name = '__title__';
  ctx.group.add(label);
});

interface ListData {
  header: string;
  rows: {id: string; label: string}[];
}

const ListNode = createElement<ListData>((ctx, data) => {
  const rowHeight = 30;
  const headerHeight = 30;
  const totalHeight = headerHeight + data.rows.length * rowHeight;

  const bg = Node.create('rect', {fill: '#fff', stroke: '#6e8efb'});
  bg.shape.from(0, 0, ctx.width, totalHeight);
  bg.name = '__bg__';
  ctx.group.add(bg);

  const title = Node.create('text', {fill: '#333', textAnchor: 'middle', dominantBaseline: 'central'});
  title.shape.from(data.header, ctx.width / 2, headerHeight / 2);
  title.name = '__header__';
  ctx.group.add(title);

  data.rows.forEach((row, i) => {
    const y = headerHeight + i * rowHeight + rowHeight / 2;
    const t = Node.create('text', {fill: '#555', dominantBaseline: 'central'});
    t.shape.from(row.label, 20, y);
    t.name = `__row-${row.id}__`;
    ctx.group.add(t);
  });
});

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('createElement', () => {
  it('返回 ElementDef 标记', () => {
    expect(Card.__element_def__).toBe(true);
    expect(typeof Card.render).toBe('function');
  });

  it('不同定义是独立对象', () => {
    const A = createElement(() => {});
    const B = createElement(() => {});
    expect(A).not.toBe(B);
  });
});

describe('Element 实例', () => {
  let container: HTMLDivElement;
  let app: App;
  let graph: GraphPlugin;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    app = new App({width: 800, height: 600});
    app.mount(container);
    graph = graphPlugin();
    app.use(graph);
    graph.register('card', Card);
    graph.register('list', ListNode);

    return () => {
      app.dispose();
      container.remove();
    };
  });

  // ========================
  // 创建
  // ========================
  describe('创建', () => {
    it('add 返回 Element 实例', () => {
      const el = graph.add('card', {id: 'c1', x: 100, y: 50, width: 200, height: 80, title: 'Hello'});
      expect(el.id).toBe('c1');
      expect(el.group).toBeInstanceOf(Group);
      expect(el.mounted).toBe(true);
    });

    it('group 自动设置 name 和 translate', () => {
      const el = graph.add('card', {id: 'c1', x: 100, y: 50, width: 200, height: 80, title: 'Test'});
      expect(el.group.name).toBe('c1');
      expect(el.group.translation[0]).toBe(100);
      expect(el.group.translation[1]).toBe(50);
    });

    it('render fn 正确填充 group children', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 200, height: 80, title: 'Card'});
      expect(el.group.children).toHaveLength(2);
      expect(el.group.find('__bg__')).toBeDefined();
      expect(el.group.find('__title__')).toBeDefined();
    });

    it('group 挂载到 scene', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(el.group.parent).not.toBeNull();
    });

    it('data 快照', () => {
      const el = graph.add('card', {id: 'c1', x: 10, y: 20, width: 100, height: 60, title: 'Snap'});
      expect(el.data.x).toBe(10);
      expect(el.data.title).toBe('Snap');
    });

    it('重复 id 抛错', () => {
      graph.add('card', {id: 'dup', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(() => graph.add('card', {id: 'dup', x: 0, y: 0, width: 100, height: 60, title: 'B'})).toThrowError(/already exists/);
    });

    it('未注册类型抛错', () => {
      expect(() => graph.add('unknown', {id: 'x', x: 0, y: 0})).toThrowError(/Unknown element type/);
    });
  });

  // ========================
  // 更新
  // ========================
  describe('更新', () => {
    it('仅位移变化不重建子树', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 200, height: 80, title: 'Move'});
      const firstBg = el.group.find('__bg__');
      el.update({x: 50, y: 60});
      expect(el.data.x).toBe(50);
      expect(el.data.y).toBe(60);
      expect(el.group.translation[0]).toBe(50);
      // 子节点没变（同一个引用）
      expect(el.group.find('__bg__')).toBe(firstBg);
    });

    it('数据变化触发重建', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 200, height: 80, title: 'Old'});
      const firstBg = el.group.find('__bg__');
      el.update({title: 'New'});
      expect(el.data.title).toBe('New');
      // 子节点重建（不同引用）
      expect(el.group.find('__bg__')).not.toBe(firstBg);
    });

    it('尺寸变化触发重建', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 200, height: 80, title: 'Resize'});
      el.update({width: 300});
      expect(el.data.width).toBe(300);
    });

    it('id 不可变', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      el.update({id: 'new-id'} as any);
      expect(el.id).toBe('c1');
    });

    it('update 时 cleanup 被调用', () => {
      const cleanup = vi.fn();
      const WithCleanup = createElement<{val: number}>(ctx => {
        const n = Node.create('rect', {fill: '#000'});
        n.shape.from(0, 0, ctx.width, ctx.height);
        ctx.group.add(n);
        ctx.onCleanup(cleanup);
      });
      graph.register('cleanup', WithCleanup);
      const el = graph.add('cleanup', {id: 'cl', x: 0, y: 0, width: 100, height: 60, val: 1});
      expect(cleanup).not.toHaveBeenCalled();
      el.update({val: 2});
      expect(cleanup).toHaveBeenCalledOnce();
    });
  });

  // ========================
  // Graph 管理
  // ========================
  describe('Graph 管理', () => {
    it('get 获取元素', () => {
      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      const el = graph.get('c1');
      expect(el).toBeDefined();
      expect(el!.id).toBe('c1');
    });

    it('has 检查存在', () => {
      expect(graph.has('c1')).toBe(false);
      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(graph.has('c1')).toBe(true);
    });

    it('remove 移除元素', () => {
      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(graph.remove('c1')).toBe(true);
      expect(graph.has('c1')).toBe(false);
      expect(graph.count).toBe(0);
    });

    it('remove 不存在元素返回 false', () => {
      expect(graph.remove('nonexistent')).toBe(false);
    });

    it('remove 从 scene 卸载 group', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      const g = el.group;
      const parent = g.parent!;
      expect(parent).not.toBeNull();
      expect(parent.children).toContain(g);
      graph.remove('c1');
      expect(parent.children).not.toContain(g);
    });

    it('getIds 返回所有 id', () => {
      graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'b', x: 100, y: 0, width: 100, height: 60, title: 'B'});
      const ids = graph.getIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
    });

    it('getAll 返回所有实例', () => {
      graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'b', x: 100, y: 0, width: 100, height: 60, title: 'B'});
      expect(graph.getAll()).toHaveLength(2);
    });

    it('count 属性', () => {
      expect(graph.count).toBe(0);
      graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(graph.count).toBe(1);
    });

    it('bus 信号 — graph:added', () => {
      const handler = vi.fn();
      app.bus.on('graph:added', handler);
      graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(handler).toHaveBeenCalledOnce();
    });

    it('bus 信号 — graph:removed', () => {
      graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      const handler = vi.fn();
      app.bus.on('graph:removed', handler);
      graph.remove('a');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('state 同步 — graph:elements', () => {
      graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'b', x: 100, y: 0, width: 100, height: 60, title: 'B'});
      const ids = app.getState<string[]>('graph:elements');
      expect(ids).toEqual(['a', 'b']);
    });
  });

  // ========================
  // dispose
  // ========================
  describe('dispose', () => {
    it('dispose 元素清理 children', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(el.group.children).toHaveLength(2);
      el.dispose();
      expect(el.group.children).toHaveLength(0);
    });

    it('dispose 调用 cleanup', () => {
      const cleanup = vi.fn();
      const WithCleanup = createElement(ctx => {
        const n = Node.create('rect', {fill: '#000'});
        n.shape.from(0, 0, 10, 10);
        ctx.group.add(n);
        ctx.onCleanup(cleanup);
      });
      graph.register('disposable', WithCleanup);
      const el = graph.add('disposable', {id: 'd1', x: 0, y: 0});
      el.dispose();
      expect(cleanup).toHaveBeenCalledOnce();
    });

    it('app.dispose 清理所有', () => {
      graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'b', x: 100, y: 0, width: 100, height: 60, title: 'B'});
      expect(graph.count).toBe(2);
      app.dispose();
      expect(graph.count).toBe(0);
    });
  });

  // ========================
  // 多类型混合
  // ========================
  describe('多类型混合', () => {
    it('不同类型共存', () => {
      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'Card'});
      graph.add('list', {
        id: 'l1',
        x: 200,
        y: 0,
        width: 200,
        header: 'List',
        rows: [
          {id: 'r1', label: 'Row 1'},
          {id: 'r2', label: 'Row 2'},
        ],
      });
      expect(graph.count).toBe(2);

      const card = graph.get<CardData>('c1')!;
      expect(card.data.title).toBe('Card');

      const list = graph.get<ListData>('l1')!;
      expect(list.data.header).toBe('List');
    });

    it('update 不影响其他元素', () => {
      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'c2', x: 200, y: 0, width: 100, height: 60, title: 'B'});

      const el1 = graph.get<CardData>('c1')!;
      el1.update({title: 'Updated'});
      expect(el1.data.title).toBe('Updated');

      const el2 = graph.get<CardData>('c2')!;
      expect(el2.data.title).toBe('B');
    });
  });

  // ========================
  // 集成场景
  // ========================
  describe('集成', () => {
    it('完整 CRUD 流程', () => {
      // Create
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 200, height: 80, title: 'Start'});
      expect(graph.count).toBe(1);

      // Read
      expect(el.data.title).toBe('Start');

      // Update
      el.update({x: 100, title: 'Updated'});
      expect(el.data.title).toBe('Updated');

      // Delete
      graph.remove('c1');
      expect(graph.count).toBe(0);
    });

    it('render fn 可使用 Node.create 等 engine 原生 API', () => {
      const Custom = createElement<{label: string}>((ctx, data) => {
        // 使用多种 engine 原生 shape
        const circle = Node.create('circle', {fill: '#ff0000'});
        circle.shape.from(ctx.width / 2, ctx.height / 2, 20);
        ctx.group.add(circle);

        const line = Node.create('line', {stroke: '#333'});
        line.shape.from(0, ctx.height / 2, ctx.width, ctx.height / 2);
        ctx.group.add(line);

        const text = Node.create('text', {fill: '#000', textAnchor: 'middle'});
        text.shape.from(data.label, ctx.width / 2, ctx.height - 10);
        ctx.group.add(text);
      });

      graph.register('custom', Custom);
      const el = graph.add('custom', {id: 'x1', x: 0, y: 0, width: 100, height: 80, label: 'CustomNode'});
      expect(el.group.children).toHaveLength(3);
    });

    it('ListNode 示例 — QueueControl', () => {
      const el = graph.add('list', {
        id: 'queue',
        x: 50,
        y: 30,
        width: 220,
        header: 'QueueControl',
        rows: [
          {id: 'in1', label: 'input1'},
          {id: 'in2', label: 'input2'},
          {id: 'in3', label: 'input3'},
        ],
      }) as Element<ListData>;

      // 结构正确
      expect(el.group.find('__bg__')).toBeDefined();
      expect(el.group.find('__header__')).toBeDefined();
      expect(el.group.find('__row-in1__')).toBeDefined();
      expect(el.group.find('__row-in2__')).toBeDefined();
      expect(el.group.find('__row-in3__')).toBeDefined();
    });

    it('render fn 第三参数 graph 可查询其他元素', () => {
      const spy = vi.fn();
      const Probe = createElement<{target: string}>((ctx, data, graph) => {
        const other = graph.get(data.target);
        spy(other?.id, graph.count);
      });
      graph.register('probe', Probe);

      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('probe', {id: 'p1', x: 0, y: 0, target: 'c1'});

      // render 时 probe 自身尚未加入 graph，所以 count = 1
      expect(spy).toHaveBeenCalledWith('c1', 1);
    });

    it('Edge element — render fn 通过 graph 获取两端 node', () => {
      interface EdgeData {
        source: string;
        target: string;
      }

      const Edge = createElement<EdgeData>((_ctx, data, graph) => {
        const src = graph.get(data.source);
        const tgt = graph.get(data.target);
        if (!src || !tgt) return;

        // 从 source 右边中点 → target 左边中点画线
        const sx = src.data.x + (src.data.width ?? 0);
        const sy = src.data.y + (src.data.height ?? 0) / 2;
        const tx = tgt.data.x;
        const ty = tgt.data.y + (tgt.data.height ?? 0) / 2;

        const line = Node.create('line', {stroke: '#999'});
        line.shape.from(sx - data.x, sy - data.y, tx - data.x, ty - data.y);
        line.name = '__edge__';
        _ctx.group.add(line);
      });

      graph.register('edge', Edge);

      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'Node1'});
      graph.add('card', {id: 'n2', x: 300, y: 100, width: 100, height: 60, title: 'Node2'});
      const edge = graph.add('edge', {id: 'e1', x: 0, y: 0, source: 'n1', target: 'n2'});

      expect(edge.group.find('__edge__')).toBeDefined();
      expect(edge.group.children).toHaveLength(1);
    });

    it('Edge element — source 不存在时优雅跳过', () => {
      interface EdgeData {
        source: string;
        target: string;
      }

      const Edge = createElement<EdgeData>((_ctx, data, graph) => {
        const src = graph.get(data.source);
        const tgt = graph.get(data.target);
        if (!src || !tgt) return;
        const line = Node.create('line', {stroke: '#999'});
        line.shape.from(0, 0, 100, 100);
        _ctx.group.add(line);
      });

      graph.register('edge', Edge);

      // source 不存在，render 中 return 了
      const edge = graph.add('edge', {id: 'e1', x: 0, y: 0, source: 'missing', target: 'also-missing'});
      expect(edge.group.children).toHaveLength(0);
    });

    it('graph.getAll / getIds / has / count 在 render fn 中可用', () => {
      const results: {ids: string[]; count: number; hasC1: boolean} = {ids: [], count: 0, hasC1: false};
      const Inspector = createElement((_ctx, _data, graph) => {
        results.ids = graph.getIds();
        results.count = graph.count;
        results.hasC1 = graph.has('c1');
      });
      graph.register('inspector', Inspector);

      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('inspector', {id: 'insp', x: 0, y: 0});

      // render 时 inspector 自身尚未加入 graph
      expect(results.hasC1).toBe(true);
      expect(results.count).toBe(1);
      expect(results.ids).toContain('c1');
    });
  });

  // ========================
  // 分层渲染
  // ========================
  describe('分层渲染', () => {
    it('默认 layer 为 nodes', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(el.layer).toBe('nodes');
    });

    it('layer: edges 挂载到 graph:edges 层', () => {
      const Stub = createElement(() => {});
      graph.register('edge', Stub);

      const el = graph.add('edge', {id: 'e1', x: 0, y: 0}, {layer: 'edges'});
      expect(el.layer).toBe('edges');

      // group 应挂载到 graph:edges 层
      const edgeLayer = app.getLayer('graph:edges');
      expect(edgeLayer).toBeDefined();
      expect(edgeLayer!.children).toContain(el.group);
    });

    it('nodes layer 和 edges layer 是独立的', () => {
      const Stub = createElement(() => {});
      graph.register('edge', Stub);

      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('edge', {id: 'e1', x: 0, y: 0}, {layer: 'edges'});

      const nodesLayer = app.getLayer('graph:nodes');
      const edgesLayer = app.getLayer('graph:edges');

      expect(nodesLayer).toBeDefined();
      expect(edgesLayer).toBeDefined();
      expect(nodesLayer).not.toBe(edgesLayer);
    });
  });

  // ========================
  // 依赖追踪
  // ========================
  describe('依赖追踪', () => {
    it('deps 存储在 element 上', () => {
      const Stub = createElement(() => {});
      graph.register('edge', Stub);

      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      const edge = graph.add('edge', {id: 'e1', x: 0, y: 0}, {layer: 'edges', deps: ['n1', 'n2']});

      expect(edge.deps).toEqual(['n1', 'n2']);
    });

    it('默认 deps 为空数组', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(el.deps).toEqual([]);
    });

    it('node 移动时 edge 自动重绘', () => {
      const renderSpy = vi.fn();

      interface EdgeData {
        source: string;
        target: string;
      }

      const Edge = createElement<EdgeData>((_ctx, data, graph) => {
        renderSpy();
        const src = graph.get(data.source);
        const tgt = graph.get(data.target);
        if (!src || !tgt) return;
      });

      graph.register('edge', Edge);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 300, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('edge', {id: 'e1', x: 0, y: 0, source: 'n1', target: 'n2'}, {layer: 'edges', deps: ['n1', 'n2']});

      // 首次渲染 = 1 次
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 移动 n1 → edge 应自动重绘
      n1.update({x: 100});
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('node 数据更新也触发 edge 重绘', () => {
      const renderSpy = vi.fn();
      const Stub = createElement(() => renderSpy());
      graph.register('edge', Stub);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('edge', {id: 'e1', x: 0, y: 0}, {layer: 'edges', deps: ['n1']});

      expect(renderSpy).toHaveBeenCalledTimes(1);
      n1.update({title: 'Updated'});
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('无 deps 的元素更新不触发其他元素', () => {
      const renderSpy = vi.fn();
      const Stub = createElement(() => renderSpy());
      graph.register('follower', Stub);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('follower', {id: 'f1', x: 0, y: 0});

      expect(renderSpy).toHaveBeenCalledTimes(1);
      n1.update({x: 100});
      // follower 没有 deps:['n1']，不会重绘
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('remove 清理依赖追踪', () => {
      const renderSpy = vi.fn();
      const Stub = createElement(() => renderSpy());
      graph.register('edge', Stub);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('edge', {id: 'e1', x: 0, y: 0}, {layer: 'edges', deps: ['n1']});

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 移除 edge 后，n1 更新不该再触发 edge 重绘
      graph.remove('e1');
      n1.update({x: 100});
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('多个 edge 依赖同一个 node', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      const Edge1 = createElement(() => spy1());
      const Edge2 = createElement(() => spy2());
      graph.register('edge1', Edge1);
      graph.register('edge2', Edge2);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('edge1', {id: 'e1', x: 0, y: 0}, {deps: ['n1']});
      graph.add('edge2', {id: 'e2', x: 0, y: 0}, {deps: ['n1']});

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);

      n1.update({x: 100});

      expect(spy1).toHaveBeenCalledTimes(2);
      expect(spy2).toHaveBeenCalledTimes(2);
    });
  });

  // ========================
  // 批量操作
  // ========================
  describe('批量操作', () => {
    it('batch 内不会多次触发 bus', () => {
      const handler = vi.fn();
      app.bus.on('graph:added', handler);

      graph.batch(() => {
        graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
        graph.add('card', {id: 'b', x: 100, y: 0, width: 100, height: 60, title: 'B'});
        graph.add('card', {id: 'c', x: 200, y: 0, width: 100, height: 60, title: 'C'});
      });

      // batch 完成后只触发一次
      expect(handler).toHaveBeenCalledTimes(1);
      expect(graph.count).toBe(3);
    });

    it('batch 内 state 只同步一次', () => {
      graph.batch(() => {
        graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
        graph.add('card', {id: 'b', x: 100, y: 0, width: 100, height: 60, title: 'B'});
      });

      const ids = app.getState<string[]>('graph:elements');
      expect(ids).toEqual(['a', 'b']);
    });

    it('batch 中的异常不影响 batching 标志重置', () => {
      expect(() => {
        graph.batch(() => {
          graph.add('card', {id: 'a', x: 0, y: 0, width: 100, height: 60, title: 'A'});
          throw new Error('oops');
        });
      }).toThrow('oops');

      // batch 标志已重置，后续 add 正常触发
      const handler = vi.fn();
      app.bus.on('graph:added', handler);
      graph.add('card', {id: 'b', x: 0, y: 0, width: 100, height: 60, title: 'B'});
      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
