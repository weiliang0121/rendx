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

import {App, Node} from 'rendx-engine';
import {createNode, createEdge} from '../src/create';
import {graphPlugin} from '../src/graph';

import type {GraphPlugin} from '../src/graph';
import type {NodeBase, EdgeBase} from '../src/types';

// ── 测试用元素定义 ──

interface BoxData extends NodeBase {
  label: string;
}

const Box = createNode<BoxData>(ctx => {
  const bg = Node.create('rect', {fill: '#fff'});
  bg.shape.from(0, 0, ctx.width, ctx.height);
  ctx.group.add(bg);
});

const NonDraggableBox = createNode<BoxData>({
  render: ctx => {
    const bg = Node.create('rect', {fill: '#eee'});
    bg.shape.from(0, 0, ctx.width, ctx.height);
    ctx.group.add(bg);
  },
  traits: {draggable: false, connectable: false},
});

const CustomTraitBox = createNode<BoxData>({
  render: ctx => {
    const bg = Node.create('rect', {fill: '#ddd'});
    bg.shape.from(0, 0, ctx.width, ctx.height);
    ctx.group.add(bg);
  },
  traits: {draggable: true, selectable: false, customProp: 'hello'},
});

// PortResolver 节点 — connectable 为函数
const PortResolverBox = createNode<BoxData>({
  render: ctx => {
    const bg = Node.create('rect', {fill: '#cff'});
    bg.shape.from(0, 0, ctx.width, ctx.height);
    ctx.group.add(bg);

    const port1 = Node.create('circle', {fill: '#fff'});
    port1.shape.from(0, ctx.height / 2, 4);
    port1.data = {role: 'port', side: 'left'};
    ctx.group.add(port1);

    const port2 = Node.create('circle', {fill: '#fff'});
    port2.shape.from(ctx.width, ctx.height / 2, 4);
    port2.data = {role: 'port', side: 'right'};
    ctx.group.add(port2);
  },
  traits: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectable: group => group.children.filter((c: any) => c.data?.role === 'port'),
  },
});

interface LinkData extends EdgeBase {
  style?: string;
}

const Link = createEdge<LinkData>(ctx => {
  const line = Node.create('line', {stroke: '#999'});
  line.shape.from(0, 0, 100, 100);
  ctx.group.add(line);
});

const SelectableLink = createEdge<LinkData>({
  render: ctx => {
    const line = Node.create('line', {stroke: '#333'});
    line.shape.from(0, 0, 100, 100);
    ctx.group.add(line);
  },
  traits: {selectable: true, deletable: false},
});

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('Element Traits — 元素特征系统', () => {
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
    graph.register('box', Box);
    graph.register('non-draggable-box', NonDraggableBox);
    graph.register('custom-trait-box', CustomTraitBox);
    graph.register('port-resolver-box', PortResolverBox);
    graph.register('link', Link);
    graph.register('selectable-link', SelectableLink);

    return () => {
      app.dispose();
      container.remove();
    };
  });

  // ════════════════════════════════════════════════════════════
  //  createNode / createEdge — traits 定义
  // ════════════════════════════════════════════════════════════

  describe('createNode / createEdge 定义层', () => {
    it('createNode(fn) 无 traits 字段', () => {
      expect(Box.traits).toBeUndefined();
    });

    it('createNode({ render, traits }) 携带 traits', () => {
      expect(NonDraggableBox.traits).toEqual({draggable: false, connectable: false});
    });

    it('createEdge(fn) 无 traits 字段', () => {
      expect(Link.traits).toBeUndefined();
    });

    it('createEdge({ render, traits }) 携带 traits', () => {
      expect(SelectableLink.traits).toEqual({selectable: true, deletable: false});
    });
  });

  // ════════════════════════════════════════════════════════════
  //  ElementImpl — 默认 traits
  // ════════════════════════════════════════════════════════════

  describe('Node 默认 traits', () => {
    it('默认 Node 具有标准默认特征', () => {
      const el = graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      expect(el.traits.draggable).toBe(true);
      expect(el.traits.selectable).toBe(true);
      expect(el.traits.connectable).toBe(true);
      expect(el.traits.deletable).toBe(true);
      expect(el.traits.positionDerived).toBe(false);
    });

    it('traits 被冻结不可修改', () => {
      const el = graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      expect(Object.isFrozen(el.traits)).toBe(true);
      expect(() => {
        (el.traits as Record<string, unknown>).draggable = false;
      }).toThrow();
    });
  });

  describe('Edge 默认 traits', () => {
    it('默认 Edge 具有标准默认特征', () => {
      graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      graph.add('box', {id: 'n2', x: 200, y: 0, width: 100, height: 60, label: 'B'});
      const el = graph.add('link', {id: 'e1', source: 'n1', target: 'n2'});
      expect(el.traits.draggable).toBe(false);
      expect(el.traits.selectable).toBe(true);
      expect(el.traits.connectable).toBe(false);
      expect(el.traits.deletable).toBe(true);
      expect(el.traits.positionDerived).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  ElementImpl — 自定义 traits 覆盖默认值
  // ════════════════════════════════════════════════════════════

  describe('自定义 traits 覆盖', () => {
    it('createNode({ traits }) 覆盖 Node 默认值', () => {
      const el = graph.add('non-draggable-box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'NoDrag'});
      expect(el.traits.draggable).toBe(false);
      expect(el.traits.connectable).toBe(false);
      // 未覆盖的保留默认值
      expect(el.traits.selectable).toBe(true);
      expect(el.traits.deletable).toBe(true);
      expect(el.traits.positionDerived).toBe(false);
    });

    it('自定义 trait key 与默认值合并', () => {
      const el = graph.add('custom-trait-box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'Custom'});
      expect(el.traits.draggable).toBe(true);
      expect(el.traits.selectable).toBe(false); // 被覆盖
      expect(el.traits.customProp).toBe('hello'); // 自定义key
    });

    it('connectable 为 PortResolver 函数时保留在 traits 中', () => {
      const el = graph.add('port-resolver-box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'PR'});
      expect(typeof el.traits.connectable).toBe('function');
    });

    it('PortResolver 函数能正确返回端口列表', () => {
      const el = graph.add('port-resolver-box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'PR'});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolver = el.traits.connectable as (group: any) => any[];
      const ports = resolver(el.group);
      expect(ports).toHaveLength(2);
      expect(ports[0].data.role).toBe('port');
      expect(ports[0].data.side).toBe('left');
      expect(ports[1].data.side).toBe('right');
    });

    it('PortResolver 通过 InteractionManager 查询', () => {
      const el = graph.add('port-resolver-box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'PR'});
      const traits = app.interaction.queryTraits(el.group);
      expect(typeof traits.connectable).toBe('function');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolver = traits.connectable as (group: any) => any[];
      const ports = resolver(el.group);
      expect(ports).toHaveLength(2);
    });

    it('createEdge({ traits }) 覆盖 Edge 默认值', () => {
      graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      graph.add('box', {id: 'n2', x: 200, y: 0, width: 100, height: 60, label: 'B'});
      const el = graph.add('selectable-link', {id: 'e1', source: 'n1', target: 'n2'});
      expect(el.traits.selectable).toBe(true);
      expect(el.traits.deletable).toBe(false); // 被覆盖
      // 未覆盖的保留默认值
      expect(el.traits.draggable).toBe(false);
      expect(el.traits.positionDerived).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  GraphPlugin.getTraits — 通过 ID 查询
  // ════════════════════════════════════════════════════════════

  describe('graph.getTraits(id)', () => {
    it('返回指定元素的 traits', () => {
      graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      const traits = graph.getTraits('n1');
      expect(traits).not.toBeNull();
      expect(traits!.draggable).toBe(true);
    });

    it('不存在的 id 返回 null', () => {
      expect(graph.getTraits('nonexistent')).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════
  //  InteractionManager 集成 — TraitProvider
  // ════════════════════════════════════════════════════════════

  describe('InteractionManager TraitProvider 集成', () => {
    it('graph-plugin 安装后 TraitProvider 已注册', () => {
      const el = graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      const traits = app.interaction.queryTraits(el.group);
      expect(traits.draggable).toBe(true);
      expect(traits.selectable).toBe(true);
    });

    it('通过 InteractionManager 查询 Edge traits', () => {
      graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      graph.add('box', {id: 'n2', x: 200, y: 0, width: 100, height: 60, label: 'B'});
      const edge = graph.add('link', {id: 'e1', source: 'n1', target: 'n2'});
      const traits = app.interaction.queryTraits(edge.group);
      expect(traits.draggable).toBe(false);
      expect(traits.positionDerived).toBe(true);
    });

    it('通过 InteractionManager 查询自定义traits 的 Node', () => {
      const el = graph.add('non-draggable-box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'NoDrag'});
      const traits = app.interaction.queryTraits(el.group);
      expect(traits.draggable).toBe(false);
    });

    it('非 graph 元素的 Graphics 查询返回空 traits', () => {
      const node = Node.create('rect', {fill: '#f00'});
      const traits = app.interaction.queryTraits(node);
      // TraitProvider 找不到 element → 返回 null → 跳过 → 空对象
      expect(Object.keys(traits)).toHaveLength(0);
    });

    it('queryTrait 便捷查询', () => {
      const el = graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      expect(app.interaction.queryTrait(el.group, 'draggable')).toBe(true);
      expect(app.interaction.queryTrait(el.group, 'unknown')).toBeUndefined();
    });

    it('graph-plugin dispose 后 TraitProvider 被清理', () => {
      const el = graph.add('box', {id: 'n1', x: 0, y: 0, width: 100, height: 60, label: 'A'});
      const group = el.group;

      // dispose 前能查询
      expect(app.interaction.queryTrait(group, 'draggable')).toBe(true);

      graph.dispose();

      // dispose 后 TraitProvider 被移除
      const traits = app.interaction.queryTraits(group);
      expect(traits.draggable).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════
  //  InteractionManager — 通道锁 与 graph-plugin 集成
  // ════════════════════════════════════════════════════════════

  describe('InteractionManager 通道锁集成', () => {
    it('graph-plugin 安装后已在 InteractionManager 注册', () => {
      // graph-plugin 注册但不参与 pointer-exclusive 通道
      // 验证注册不抛错
      expect(app.interaction.getPriority('graph')).toBe(0);
    });

    it('模拟 drag + selection 互斥场景', () => {
      // 模拟其他插件的注册
      app.interaction.register('drag', {channels: ['pointer-exclusive'], priority: 10});
      app.interaction.register('selection', {channels: ['pointer-exclusive'], priority: 5});

      // drag 获取锁
      app.interaction.acquire('pointer-exclusive', 'drag');
      expect(app.interaction.isLockedByOther('pointer-exclusive', 'selection')).toBe(true);

      // 释放
      app.interaction.release('pointer-exclusive', 'drag');
      expect(app.interaction.isLockedByOther('pointer-exclusive', 'selection')).toBe(false);
    });
  });
});
