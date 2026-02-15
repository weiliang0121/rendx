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
import {createNode, createEdge} from '../src/create';
import {graphPlugin} from '../src/graph';

import type {GraphPlugin} from '../src/graph';
import type {Element, NodeBase, EdgeBase} from '../src/types';

// ── 测试用的 Element 类型定义 ──

interface CardData extends NodeBase {
  title: string;
  color?: string;
}

const Card = createNode<CardData>((ctx, data) => {
  const bg = Node.create('rect', {fill: data.color ?? '#ffffff', stroke: '#333'});
  bg.shape.from(0, 0, ctx.width, ctx.height);
  bg.name = '__bg__';
  ctx.group.add(bg);

  const label = Node.create('text', {fill: '#333', textAnchor: 'middle', dominantBaseline: 'central'});
  label.shape.from(data.title, ctx.width / 2, ctx.height / 2);
  label.name = '__title__';
  ctx.group.add(label);
});

interface ListData extends NodeBase {
  header: string;
  rows: {id: string; label: string}[];
}

const ListNode = createNode<ListData>((ctx, data) => {
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

interface SimpleEdgeData extends EdgeBase {
  color?: string;
}

const SimpleEdge = createEdge<SimpleEdgeData>((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;

  const srcData = src.data as CardData;
  const tgtData = tgt.data as CardData;

  const sx = srcData.x + (srcData.width ?? 0);
  const sy = srcData.y + (srcData.height ?? 0) / 2;
  const tx = tgtData.x;
  const ty = tgtData.y + (tgtData.height ?? 0) / 2;

  const line = Node.create('line', {stroke: data.color ?? '#999'});
  line.shape.from(sx, sy, tx, ty);
  line.name = '__edge__';
  ctx.group.add(line);
});

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('createNode / createEdge', () => {
  it('createNode 返回 NodeDef 标记', () => {
    expect(Card.__element_def__).toBe(true);
    expect(Card.role).toBe('node');
    expect(typeof Card.render).toBe('function');
  });

  it('createEdge 返回 EdgeDef 标记', () => {
    expect(SimpleEdge.__element_def__).toBe(true);
    expect(SimpleEdge.role).toBe('edge');
    expect(typeof SimpleEdge.render).toBe('function');
  });

  it('不同定义是独立对象', () => {
    const A = createNode(() => {});
    const B = createNode(() => {});
    expect(A).not.toBe(B);
  });

  it('Node 和 Edge 定义是不同 role', () => {
    const N = createNode(() => {});
    const E = createEdge(() => {});
    expect(N.role).toBe('node');
    expect(E.role).toBe('edge');
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
    graph.register('edge', SimpleEdge);

    return () => {
      app.dispose();
      container.remove();
    };
  });

  // ========================
  // 创建
  // ========================
  describe('创建', () => {
    it('add node 返回 Element 实例', () => {
      const el = graph.add('card', {id: 'c1', x: 100, y: 50, width: 200, height: 80, title: 'Hello'});
      expect(el.id).toBe('c1');
      expect(el.role).toBe('node');
      expect(el.group).toBeInstanceOf(Group);
      expect(el.mounted).toBe(true);
    });

    it('node group 自动设置 name 和 translate', () => {
      const el = graph.add('card', {id: 'c1', x: 100, y: 50, width: 200, height: 80, title: 'Test'});
      expect(el.group.name).toBe('c1');
      expect(el.group.translation[0]).toBe(100);
      expect(el.group.translation[1]).toBe(50);
    });

    it('edge group 不设置 translate', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 300, y: 0, width: 100, height: 60, title: 'B'});
      const edge = graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      expect(edge.group.translation[0]).toBe(0);
      expect(edge.group.translation[1]).toBe(0);
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
      expect((el.data as CardData).title).toBe('Snap');
    });

    it('重复 id 抛错', () => {
      graph.add('card', {id: 'dup', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(() => graph.add('card', {id: 'dup', x: 0, y: 0, width: 100, height: 60, title: 'B'})).toThrowError(/already exists/);
    });

    it('未注册类型抛错', () => {
      expect(() => graph.add('unknown', {id: 'x', x: 0, y: 0})).toThrowError(/Unknown element type/);
    });

    it('edge render fn 接收 ctx.source 和 ctx.target', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 300, y: 0, width: 100, height: 60, title: 'B'});
      const edge = graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      expect(edge.group.find('__edge__')).toBeDefined();
      expect(edge.group.children).toHaveLength(1);
    });

    it('edge source 不存在时 ctx.source 为 undefined', () => {
      const edge = graph.add('edge', {id: 'e1', source: 'missing', target: 'also-missing'});
      // render fn 中 src/tgt undefined → return → 0 children
      expect(edge.group.children).toHaveLength(0);
    });
  });

  // ========================
  // 更新
  // ========================
  describe('更新', () => {
    it('仅位移变化不重建子树 (position-only)', () => {
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
      el.update({title: 'New'} as Partial<CardData>);
      expect((el.data as CardData).title).toBe('New');
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
      const WithCleanup = createNode<NodeBase & {val: number}>(ctx => {
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

    it('edge cleanup 在更新时被调用', () => {
      const cleanup = vi.fn();
      const CleanEdge = createEdge<EdgeBase>(ctx => {
        const n = Node.create('rect', {fill: '#000'});
        n.shape.from(0, 0, 10, 10);
        ctx.group.add(n);
        ctx.onCleanup(cleanup);
      });
      graph.register('clean-edge', CleanEdge);
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      const el = graph.add('clean-edge', {id: 'ce1', source: 'n1', target: 'n2'});
      expect(cleanup).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      el.update({color: 'red'} as any);
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
      const WithCleanup = createNode(ctx => {
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

    it('node 和 edge 混合', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 300, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      expect(graph.count).toBe(3);
      expect(graph.get('e1')!.role).toBe('edge');
      expect(graph.get('n1')!.role).toBe('node');
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
      expect((el.data as CardData).title).toBe('Start');

      // Update
      el.update({x: 100, title: 'Updated'} as Partial<CardData>);
      expect((el.data as CardData).title).toBe('Updated');

      // Delete
      graph.remove('c1');
      expect(graph.count).toBe(0);
    });

    it('render fn 可使用 Node.create 等 engine 原生 API', () => {
      const Custom = createNode<NodeBase & {label: string}>((ctx, data) => {
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

      expect(el.group.find('__bg__')).toBeDefined();
      expect(el.group.find('__header__')).toBeDefined();
      expect(el.group.find('__row-in1__')).toBeDefined();
      expect(el.group.find('__row-in2__')).toBeDefined();
      expect(el.group.find('__row-in3__')).toBeDefined();
    });

    it('render fn 第三参数 graph 可查询其他元素', () => {
      const spy = vi.fn();
      const Probe = createNode<NodeBase & {target: string}>((ctx, data, graph) => {
        const other = graph.get(data.target);
        spy(other?.id, graph.count);
      });
      graph.register('probe', Probe);

      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('probe', {id: 'p1', x: 0, y: 0, target: 'c1'});

      // render 时 probe 自身尚未加入 graph，所以 count = 1
      expect(spy).toHaveBeenCalledWith('c1', 1);
    });

    it('graph.getAll / getIds / has / count 在 render fn 中可用', () => {
      const results: {ids: string[]; count: number; hasC1: boolean} = {ids: [], count: 0, hasC1: false};
      const Inspector = createNode((_ctx, _data, graph) => {
        results.ids = graph.getIds();
        results.count = graph.count;
        results.hasC1 = graph.has('c1');
      });
      graph.register('inspector', Inspector);

      graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('inspector', {id: 'insp', x: 0, y: 0});

      expect(results.hasC1).toBe(true);
      expect(results.count).toBe(1);
      expect(results.ids).toContain('c1');
    });
  });

  // ========================
  // 分层渲染
  // ========================
  describe('分层渲染', () => {
    it('node 默认 layer 为 nodes', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(el.layer).toBe('nodes');
    });

    it('edge 默认 layer 为 edges', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      const el = graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      expect(el.layer).toBe('edges');
    });

    it('node group 挂载到 nodesGroup', () => {
      const n = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(graph.nodesGroup.children).toContain(n.group);
    });

    it('edge group 挂载到 edgesGroup', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      const e = graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      expect(graph.edgesGroup.children).toContain(e.group);
    });

    it('nodes 和 edges 分组是独立的', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      const n = graph.get('n1')!;
      const e = graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});

      expect(graph.nodesGroup.children).toContain(n.group);
      expect(graph.edgesGroup.children).toContain(e.group);
      expect(graph.nodesGroup.children).not.toContain(e.group);
      expect(graph.edgesGroup.children).not.toContain(n.group);
    });

    it('不创建额外的 Canvas 层', () => {
      expect(app.getLayer('graph:edges')).toBeUndefined();
      expect(app.getLayer('graph:nodes')).toBeUndefined();

      const defaultLayer = app.getLayer('default')!;
      expect(defaultLayer).toBeDefined();
      expect(defaultLayer.children).toContain(graph.edgesGroup);
      expect(defaultLayer.children).toContain(graph.nodesGroup);
    });
  });

  // ========================
  // 依赖追踪
  // ========================
  describe('依赖追踪', () => {
    it('edge 自动从 source/target 派生 deps', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      const edge = graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      expect(edge.deps).toEqual(['n1', 'n2']);
    });

    it('node 默认 deps 为空数组', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(el.deps).toEqual([]);
    });

    it('node 移动时 edge 自动重绘', () => {
      const renderSpy = vi.fn();

      const SpyEdge = createEdge<SimpleEdgeData>(ctx => {
        renderSpy();
        // minimal render
        if (ctx.source && ctx.target) {
          const line = Node.create('line', {stroke: '#999'});
          line.shape.from(0, 0, 100, 100);
          ctx.group.add(line);
        }
      });
      graph.register('spy-edge', SpyEdge);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 300, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('spy-edge', {id: 'e1', source: 'n1', target: 'n2'});

      // 首次渲染 = 1 次
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 移动 n1 → edge 应自动重绘
      n1.update({x: 100});
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('node 数据更新也触发 edge 重绘', () => {
      const renderSpy = vi.fn();
      const SpyEdge = createEdge(() => renderSpy());
      graph.register('spy-edge2', SpyEdge);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('spy-edge2', {id: 'e1', source: 'n1', target: 'n2'});

      expect(renderSpy).toHaveBeenCalledTimes(1);
      n1.update({title: 'Updated'} as Partial<CardData>);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('无 deps 的元素更新不触发其他元素', () => {
      const renderSpy = vi.fn();
      const Follower = createNode(() => renderSpy());
      graph.register('follower', Follower);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('follower', {id: 'f1', x: 0, y: 0});

      expect(renderSpy).toHaveBeenCalledTimes(1);
      n1.update({x: 100});
      // follower 没有 dep 到 n1，不会重绘
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('remove 清理依赖追踪', () => {
      const renderSpy = vi.fn();
      const SpyEdge = createEdge(() => renderSpy());
      graph.register('spy-edge3', SpyEdge);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('spy-edge3', {id: 'e1', source: 'n1', target: 'n2'});

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // 移除 edge 后，n1 更新不该再触发 edge 重绘
      graph.remove('e1');
      n1.update({x: 100});
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('多个 edge 依赖同一个 node', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      const Edge1 = createEdge(() => spy1());
      const Edge2 = createEdge(() => spy2());
      graph.register('edge1', Edge1);
      graph.register('edge2', Edge2);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('edge1', {id: 'e1', source: 'n1', target: 'n2'});
      graph.add('edge2', {id: 'e2', source: 'n1', target: 'n2'});

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);

      n1.update({x: 100});

      expect(spy1).toHaveBeenCalledTimes(2);
      expect(spy2).toHaveBeenCalledTimes(2);
    });

    it('手动指定 deps 覆盖自动派生', () => {
      const renderSpy = vi.fn();
      const ManualDep = createNode(() => renderSpy());
      graph.register('manual', ManualDep);

      const n1 = graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('manual', {id: 'f1', x: 0, y: 0}, {deps: ['n1']});

      expect(renderSpy).toHaveBeenCalledTimes(1);
      n1.update({x: 100});
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ========================
  // Graph 查询
  // ========================
  describe('Graph 查询', () => {
    it('getNodes 只返回 node 角色的元素', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});

      const nodes = graph.getNodes();
      expect(nodes).toHaveLength(2);
      expect(nodes.every(n => n.role === 'node')).toBe(true);
    });

    it('getEdges 只返回 edge 角色的元素', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      graph.add('edge', {id: 'e2', source: 'n2', target: 'n1'});

      const edges = graph.getEdges();
      expect(edges).toHaveLength(2);
      expect(edges.every(e => e.role === 'edge')).toBe(true);
    });

    it('getEdgesOf 返回关联到指定 node 的所有 edge', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      graph.add('card', {id: 'n3', x: 400, y: 0, width: 100, height: 60, title: 'C'});
      graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      graph.add('edge', {id: 'e2', source: 'n2', target: 'n3'});
      graph.add('edge', {id: 'e3', source: 'n1', target: 'n3'});

      // n1 关联 e1 (source) 和 e3 (source)
      const n1Edges = graph.getEdgesOf('n1');
      expect(n1Edges).toHaveLength(2);
      expect(n1Edges.map(e => e.id).sort()).toEqual(['e1', 'e3']);

      // n2 关联 e1 (target) 和 e2 (source)
      const n2Edges = graph.getEdgesOf('n2');
      expect(n2Edges).toHaveLength(2);
      expect(n2Edges.map(e => e.id).sort()).toEqual(['e1', 'e2']);

      // n3 关联 e2 (target) 和 e3 (target)
      const n3Edges = graph.getEdgesOf('n3');
      expect(n3Edges).toHaveLength(2);
      expect(n3Edges.map(e => e.id).sort()).toEqual(['e2', 'e3']);
    });

    it('getEdgesOf 不存在的 node 返回空数组', () => {
      expect(graph.getEdgesOf('nonexistent')).toEqual([]);
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

  // ========================
  // role 属性
  // ========================
  describe('role 属性', () => {
    it('node 实例的 role 为 node', () => {
      const el = graph.add('card', {id: 'c1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      expect(el.role).toBe('node');
    });

    it('edge 实例的 role 为 edge', () => {
      graph.add('card', {id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A'});
      graph.add('card', {id: 'n2', x: 200, y: 0, width: 100, height: 60, title: 'B'});
      const el = graph.add('edge', {id: 'e1', source: 'n1', target: 'n2'});
      expect(el.role).toBe('edge');
    });
  });
});
