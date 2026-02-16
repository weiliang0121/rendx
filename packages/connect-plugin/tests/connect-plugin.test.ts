import {describe, it, expect, vi, beforeEach} from 'vitest';

// ── Mock canvas 2d context (happy-dom doesn't support Canvas2D) ──
const mockCtx = {
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  rect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({width: 0})),
  createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  createRadialGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  drawImage: vi.fn(),
  canvas: document.createElement('canvas'),
  globalAlpha: 1,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  lineDashOffset: 0,
  font: '',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  globalCompositeOperation: 'source-over',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  setLineDash: vi.fn(),
  getLineDash: vi.fn(() => []),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Path2D = class Path2D {
  constructor() {}
};

const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any;
  return () => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  };
});

import {connectPlugin} from '../src/main';
import {App, Node, SimulatedEvent, Graphics} from 'rendx-engine';
import {graphPlugin, createNode} from 'rendx-graph-plugin';

import type {ConnectStartEvent, ConnectCompleteEvent, ConnectMoveEvent} from '../src/main';

// ── 测试工具 ──

function createSimEvent(type: string, target: Graphics, opts?: {worldX?: number; worldY?: number; offsetX?: number; offsetY?: number}) {
  const native = new PointerEvent(type);
  const event = new SimulatedEvent(type, target, native);
  event.worldX = opts?.worldX ?? 0;
  event.worldY = opts?.worldY ?? 0;
  event.offsetX = opts?.offsetX ?? event.worldX;
  event.offsetY = opts?.offsetY ?? event.worldY;
  return event;
}

/** 创建带 graph-plugin 的 App（connect-plugin 依赖 graph-plugin） */
function createGraphApp() {
  const container = document.createElement('div');
  const app = new App({width: 600, height: 400});
  app.mount(container);

  const graph = graphPlugin();
  app.use(graph);

  // connectable: true — element group 本身作为连接端点
  const ConnectableNode = createNode({
    render: ctx => {
      const r = Node.create('rect', {fill: '#fff'});
      r.shape.from(0, 0, ctx.width, ctx.height);
      ctx.group.add(r);
    },
    traits: {connectable: true},
  });
  graph.register('node', ConnectableNode);

  // 不可连接节点
  const PlainNode = createNode({
    render: ctx => {
      const r = Node.create('rect', {fill: '#eee'});
      r.shape.from(0, 0, ctx.width, ctx.height);
      ctx.group.add(r);
    },
    traits: {connectable: false},
  });
  graph.register('plain', PlainNode);

  // PortResolver 节点 — 通过 data.role 识别端口
  const PortNode = createNode({
    render: ctx => {
      const bg = Node.create('rect', {fill: '#fff'});
      bg.shape.from(0, 0, ctx.width, ctx.height);
      ctx.group.add(bg);

      const leftPort = Node.create('circle', {fill: '#333'});
      leftPort.shape.from(0, ctx.height / 2, 5);
      leftPort.data = {role: 'port', side: 'left'};
      ctx.group.add(leftPort);

      const rightPort = Node.create('circle', {fill: '#333'});
      rightPort.shape.from(ctx.width, ctx.height / 2, 5);
      rightPort.data = {role: 'port', side: 'right'};
      ctx.group.add(rightPort);
    },
    traits: {
      connectable: (group: Graphics) => group.children.filter((c: Graphics) => c.data?.role === 'port'),
    },
  });
  graph.register('port-node', PortNode);

  return {app, container, graph};
}

/** 通过 graph.add 添加可连接节点并返回其 element group */
function addConnectableNode(graph: ReturnType<typeof graphPlugin>, id: string, x: number, y: number, w = 50, h = 50) {
  graph.add('node', {id, x, y, width: w, height: h});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = (graph as any).get(id);
  return el.group as Graphics;
}

/** 便捷创建 App（不带 graph-plugin）— 仅用于基础插件属性测试 */
function createApp() {
  const container = document.createElement('div');
  const app = new App({width: 600, height: 400});
  app.mount(container);
  return {app, container};
}

// ════════════════════════════════════════════════════════════
//  Plugin 基础
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin basics', () => {
  it('should have correct plugin name', () => {
    const plugin = connectPlugin();
    expect(plugin.name).toBe('connect');
  });

  it('should declare state keys', () => {
    const plugin = connectPlugin();
    expect(plugin.state).toHaveLength(2);
    expect(plugin.state[0].key).toBe('connect:connecting');
    expect(plugin.state[1].key).toBe('connect:source');
  });

  it('should declare selection overlay layer', () => {
    const plugin = connectPlugin();
    expect(plugin.layers).toHaveLength(1);
    expect(plugin.layers[0].name).toBe('selection');
    expect(plugin.layers[0].zIndex).toBe(10);
  });

  it('should install without errors', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);
    expect(plugin.isConnecting()).toBe(false);
  });

  it('should be idle after install', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);
    expect(plugin.isConnecting()).toBe(false);
    expect(plugin.getSource()).toBe(null);
  });

  it('should dispose without errors', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);
    plugin.dispose();
    expect(plugin.isConnecting()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
//  连接交互 — connectable: true
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — connectable:true mode', () => {
  it('should ignore pointerdown on non-connectable targets', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    graph.add('plain', {id: 'p1', x: 0, y: 0, width: 50, height: 50});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group = (graph as any).get('p1').group as Graphics;
    app.render();

    const child = group.children[0];
    const e = createSimEvent('pointerdown', child, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', e);

    expect(plugin.isConnecting()).toBe(false);
  });

  it('should start connecting on connectable target pointerdown', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    const child = group.children[0];
    const e = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', e);

    expect(plugin.isConnecting()).toBe(true);
    expect(plugin.getSource()).toBe(group);
    expect(app.getState('connect:connecting')).toBe(true);
  });

  it('should emit connect:start event', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    const handler = vi.fn();
    app.bus.on('connect:start', handler);

    const child = group.children[0];
    const e = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', e);

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as ConnectStartEvent;
    expect(payload.source).toBe(group);
  });

  it('should emit connect:move event on pointermove', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    addConnectableNode(graph, 'n2', 300, 300, 50, 50);
    app.render();

    // Start connect
    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);

    const handler = vi.fn();
    app.bus.on('connect:move', handler);

    // Move
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 200, worldY: 200});
    app.scene.emit('pointermove', moveE);

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as ConnectMoveEvent;
    expect(payload.source).toBe(src);
  });

  it('should cancel on pointerup in empty space', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);

    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Release in empty space (no snap target)
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(plugin.isConnecting()).toBe(false);
    expect(cancelHandler).toHaveBeenCalledOnce();
    expect(app.getState('connect:connecting')).toBe(false);
  });

  it('should cancel on Escape key', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);

    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

    expect(plugin.isConnecting()).toBe(false);
    expect(cancelHandler).toHaveBeenCalledOnce();
  });

  it('should complete connection via snap and create line in engine mode', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({snapRadius: 50});
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    const tgt = addConnectableNode(graph, 'n2', 200, 200, 50, 50);
    app.render();

    const completeHandler = vi.fn();
    app.bus.on('connect:complete', completeHandler);

    // Start from src
    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    // Move near target (within snap radius of [225, 225] center)
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 220, worldY: 220});
    app.scene.emit('pointermove', moveE);

    // Release (snap target should be found)
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(plugin.isConnecting()).toBe(false);
    expect(completeHandler).toHaveBeenCalledOnce();
    const payload = completeHandler.mock.calls[0][0] as ConnectCompleteEvent;
    expect(payload.source).toBe(src);
    expect(payload.target).toBe(tgt);
  });

  it('should not allow self-loop by default', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    // Start from node
    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);

    // Move to same node center area
    const moveE = createSimEvent('pointermove', child, {worldX: 126, worldY: 126});
    app.scene.emit('pointermove', moveE);

    // Release — should cancel, not complete
    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(cancelHandler).toHaveBeenCalledOnce();
  });

  it('should allow self-loop when configured', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({snapRadius: 100, allowSelfLoop: true});
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);

    const moveE = createSimEvent('pointermove', child, {worldX: 126, worldY: 126});
    app.scene.emit('pointermove', moveE);

    const completeHandler = vi.fn();
    app.bus.on('connect:complete', completeHandler);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(completeHandler).toHaveBeenCalledOnce();
  });

  it('should remove connection by id', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({snapRadius: 50});
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    addConnectableNode(graph, 'n2', 200, 200, 50, 50);
    app.render();

    // Create connection
    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 220, worldY: 220});
    app.scene.emit('pointermove', moveE);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(plugin.getConnections()).toHaveLength(1);
    const connId = plugin.getConnections()[0].id;

    expect(plugin.removeConnection(connId)).toBe(true);
    expect(plugin.getConnections()).toHaveLength(0);
  });

  it('should return false when removing non-existent connection', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    expect(plugin.removeConnection('does-not-exist')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
//  canConnect 过滤
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — canConnect filter', () => {
  it('should respect canConnect callback', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({
      snapRadius: 100,
      canConnect: (_src, tgt) => tgt.name !== 'blocked',
    });
    app.use(plugin);

    const src = addConnectableNode(graph, 'src', 0, 0, 50, 50);
    addConnectableNode(graph, 'blocked', 100, 100, 50, 50);
    app.render();

    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    // Move near blocked target
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 125, worldY: 125});
    app.scene.emit('pointermove', moveE);

    // Release — should cancel because target is blocked
    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(cancelHandler).toHaveBeenCalledOnce();
  });
});

// ════════════════════════════════════════════════════════════
//  Public API
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — public API', () => {
  it('cancel() should cancel an active connection', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);

    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);

    plugin.cancel();

    expect(plugin.isConnecting()).toBe(false);
    expect(cancelHandler).toHaveBeenCalledOnce();
  });

  it('cancel() should be no-op when idle', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    plugin.cancel(); // should not throw
    expect(plugin.isConnecting()).toBe(false);
  });

  it('syncConnections() should update line positions', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({snapRadius: 50});
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    addConnectableNode(graph, 'n2', 200, 200, 50, 50);
    app.render();

    // Create connection
    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 220, worldY: 220});
    app.scene.emit('pointermove', moveE);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(plugin.getConnections()).toHaveLength(1);

    // Move source node
    src.translate(50, 50);

    // Sync should not throw
    plugin.syncConnections();
  });

  it('serialize() should return connection data', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const result = plugin.serialize();
    expect(result).toHaveProperty('connections');
    expect(result.connections).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════
//  Drag 互斥
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — drag interop', () => {
  it('should not start connecting when drag is active', () => {
    const {app, graph} = createGraphApp();

    // 通过 InteractionManager 模拟 drag 持有 pointer-exclusive 锁
    app.interaction.register('drag', {channels: ['pointer-exclusive'], priority: 10});
    app.interaction.acquire('pointer-exclusive', 'drag');

    const plugin = connectPlugin();
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 100, 100, 50, 50);
    app.render();

    const child = group.children[0];
    const e = createSimEvent('pointerdown', child, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', e);

    expect(plugin.isConnecting()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
//  锚点计算
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — custom anchor', () => {
  it('should use custom anchor function', () => {
    const {app, graph} = createGraphApp();
    const customAnchor = vi.fn(() => [999, 888] as [number, number]);
    const plugin = connectPlugin({
      anchor: customAnchor,
      snapRadius: 50,
    });
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    app.render();

    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    // Custom anchor should have been called for the source
    expect(customAnchor).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════
//  自定义预览路径
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — custom previewPath', () => {
  it('should call previewPath during connecting', () => {
    const {app, graph} = createGraphApp();
    const previewPath = vi.fn((source: [number, number], target: [number, number]) => `M${source[0]} ${source[1]}C${(source[0] + target[0]) / 2} ${source[1]},${(source[0] + target[0]) / 2} ${target[1]},${target[0]} ${target[1]}`);
    const plugin = connectPlugin({previewPath, snapRadius: 100});
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    addConnectableNode(graph, 'n2', 200, 0, 50, 50);
    app.render();

    // Start connection
    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Move — should call previewPath
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 100, worldY: 25});
    app.scene.emit('pointermove', moveE);

    expect(previewPath).toHaveBeenCalled();
    const lastCall = previewPath.mock.calls[previewPath.mock.calls.length - 1];
    expect(lastCall[0]).toBeInstanceOf(Array); // source point
    expect(lastCall[1]).toBeInstanceOf(Array); // target point
  });

  it('should hide preview in layer on cancel', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    app.render();

    // Start connection
    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Move to show preview
    const moveE = createSimEvent('pointermove', child, {worldX: 100, worldY: 100});
    app.scene.emit('pointermove', moveE);

    // Cancel via pointerup without snap target
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(plugin.isConnecting()).toBe(false);

    // Preview line should be hidden (display=false) but still in layer
    const overlayLayer = app.getLayer('selection');
    expect(overlayLayer!.children.length).toBe(1);
    expect(overlayLayer!.children[0].display).toBe(false);
  });

  it('should hide preview in layer on complete', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    addConnectableNode(graph, 'n2', 200, 0, 50, 50);
    app.render();

    // Start connection
    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    // Move to snap target
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 225, worldY: 25});
    app.scene.emit('pointermove', moveE);

    // Complete
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(plugin.isConnecting()).toBe(false);

    // Preview line should be hidden (display=false) but still in layer
    const overlayLayer = app.getLayer('selection');
    expect(overlayLayer!.children.length).toBe(1);
    expect(overlayLayer!.children[0].display).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
//  Graph 集成 — PortResolver
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — graph integration', () => {
  it('should resolve element ID via parent chain and create edge', () => {
    const {app, graph} = createGraphApp();

    // 注册 PortResolver 节点类型
    graph.add('port-node', {id: 'node-1', x: 0, y: 0, width: 50, height: 50});
    graph.add('port-node', {id: 'node-2', x: 200, y: 200, width: 50, height: 50});

    const plugin = connectPlugin({
      edgeType: null, // 无 edgeType → 纯引擎模式 line
      snapRadius: 100,
    });
    app.use(plugin);
    app.render();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el1 = (graph as any).get('node-1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el2 = (graph as any).get('node-2');
    const port1 = el1.group.children.find((c: Graphics) => c.data?.side === 'right');
    el2.group.children.find((c: Graphics) => c.data?.side === 'left');

    // Start from port (child of node-1 group)
    const downE = createSimEvent('pointerdown', port1, {worldX: 50, worldY: 25});
    app.scene.emit('pointerdown', downE);

    expect(plugin.isConnecting()).toBe(true);

    // Move near port2
    const moveE = createSimEvent('pointermove', port1, {worldX: 200, worldY: 225});
    app.scene.emit('pointermove', moveE);

    // Release
    window.dispatchEvent(new PointerEvent('pointerup'));

    // Connection should have been created
    expect(plugin.isConnecting()).toBe(false);
    expect(plugin.getConnections()).toHaveLength(1);
  });

  it('should use custom edgeFactory when provided', () => {
    const {app, graph} = createGraphApp();

    const customFactory = vi.fn(() => ({
      id: 'custom-edge',
      source: 'custom-src',
      target: 'custom-tgt',
      color: '#ff0000',
    }));

    // 注册一个 edge 类型
    const MockEdge = {
      __element_def__: true as const,
      role: 'edge' as const,
      render: () => {},
    };
    graph.register('edge', MockEdge);

    const plugin = connectPlugin({
      edgeType: 'edge',
      edgeFactory: customFactory,
      snapRadius: 100,
    });
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    addConnectableNode(graph, 'n2', 100, 100, 50, 50);
    app.render();

    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    const moveE = createSimEvent('pointermove', srcChild, {worldX: 125, worldY: 125});
    app.scene.emit('pointermove', moveE);

    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(customFactory).toHaveBeenCalledOnce();
  });

  it('should fall back to engine line when no edgeType is set', () => {
    const {app, graph} = createGraphApp();

    // No edgeType set → should use engine line
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    addConnectableNode(graph, 'n2', 100, 100, 50, 50);
    app.render();

    const srcChild = src.children[0];
    const downE = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', srcChild, {worldX: 125, worldY: 125});
    app.scene.emit('pointermove', moveE);
    window.dispatchEvent(new PointerEvent('pointerup'));

    // Engine line should have been created
    expect(plugin.getConnections()).toHaveLength(1);
  });

  it('should include port data as sourcePort/targetPort in default edge data', () => {
    const {app, graph} = createGraphApp();

    // 注册 edge 类型用于接收 edgeData
    const addSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origAdd = (graph as any).add.bind(graph);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (graph as any).add = (...args: any[]) => {
      addSpy(...args);
      return origAdd(...args);
    };

    const MockEdge = {
      __element_def__: true as const,
      role: 'edge' as const,
      render: () => {},
    };
    graph.register('edge', MockEdge);

    const plugin = connectPlugin({edgeType: 'edge', snapRadius: 100});
    app.use(plugin);

    // 使用 PortResolver 节点 — 端口带 data
    graph.add('port-node', {id: 'node-A', x: 0, y: 0, width: 50, height: 50});
    graph.add('port-node', {id: 'node-B', x: 200, y: 200, width: 50, height: 50});
    app.render();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elA = (graph as any).get('node-A');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elB = (graph as any).get('node-B');
    const portA = elA.group.children.find((c: Graphics) => c.data?.side === 'right');
    elB.group.children.find((c: Graphics) => c.data?.side === 'left');

    const downE = createSimEvent('pointerdown', portA, {worldX: 50, worldY: 25});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', portA, {worldX: 200, worldY: 225});
    app.scene.emit('pointermove', moveE);
    window.dispatchEvent(new PointerEvent('pointerup'));

    // 找到 add('edge', ...) 的调用
    const edgeCall = addSpy.mock.calls.find((c: unknown[]) => c[0] === 'edge');
    expect(edgeCall).toBeDefined();
    const edgeData = edgeCall![1] as Record<string, unknown>;
    expect(edgeData.source).toBe('node-A');
    expect(edgeData.target).toBe('node-B');
    expect(edgeData.sourcePort).toEqual({role: 'port', side: 'right'});
    expect(edgeData.targetPort).toEqual({role: 'port', side: 'left'});
  });
});

// ════════════════════════════════════════════════════════════
//  边缘情况
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — edge cases', () => {
  it('should not start second connection while already connecting', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const src = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    const other = addConnectableNode(graph, 'n2', 200, 200, 50, 50);
    app.render();

    // Start first connection
    const srcChild = src.children[0];
    const e1 = createSimEvent('pointerdown', srcChild, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', e1);
    expect(plugin.isConnecting()).toBe(true);
    expect(plugin.getSource()).toBe(src);

    // Try second connection — should be ignored
    const otherChild = other.children[0];
    const e2 = createSimEvent('pointerdown', otherChild, {worldX: 225, worldY: 225});
    app.scene.emit('pointerdown', e2);
    expect(plugin.getSource()).toBe(src); // still first source
  });

  it('should dispose gracefully while connecting', () => {
    const {app, graph} = createGraphApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const group = addConnectableNode(graph, 'n1', 0, 0, 50, 50);
    app.render();

    const child = group.children[0];
    const downE = createSimEvent('pointerdown', child, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Dispose during connection — should not throw
    plugin.dispose();
    expect(plugin.isConnecting()).toBe(false);
  });
});
