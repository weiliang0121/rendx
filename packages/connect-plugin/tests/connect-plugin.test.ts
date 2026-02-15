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
import {App, Node, Group, SimulatedEvent, Graphics} from 'rendx-engine';

import type {ConnectStartEvent, ConnectCompleteEvent, ConnectMoveEvent} from '../src/main';

// ── 测试工具 ──

function createApp() {
  const container = document.createElement('div');
  const app = new App({width: 600, height: 400});
  app.mount(container);
  return {app, container};
}

function createSimEvent(type: string, target: Graphics, opts?: {worldX?: number; worldY?: number; offsetX?: number; offsetY?: number}) {
  const native = new PointerEvent(type);
  const event = new SimulatedEvent(type, target, native);
  event.worldX = opts?.worldX ?? 0;
  event.worldY = opts?.worldY ?? 0;
  event.offsetX = opts?.offsetX ?? event.worldX;
  event.offsetY = opts?.offsetY ?? event.worldY;
  return event;
}

function createConnectableNode(name: string, x: number, y: number, w: number, h: number) {
  const node = Node.create('rect', {fill: '#fff'});
  node.setName(name);
  node.setClassName('connectable');
  node.shape.from(0, 0, w, h);
  node.translate(x, y);
  // 需要手动更新一次让 worldMatrix 和 bbox 生效
  node.needUpdate = true;
  return node;
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

  it('should declare connect layer', () => {
    const plugin = connectPlugin();
    expect(plugin.layers).toHaveLength(1);
    expect(plugin.layers[0].name).toBe('connect');
    expect(plugin.layers[0].zIndex).toBe(900);
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
//  连接交互 — 纯引擎模式
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — pure engine mode', () => {
  it('should ignore pointerdown on non-connectable targets', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const node = Node.create('rect', {fill: '#fff'});
    // 不设 className
    app.scene.add(node);

    const e = createSimEvent('pointerdown', node, {worldX: 50, worldY: 50});
    app.scene.emit('pointerdown', e);

    expect(plugin.isConnecting()).toBe(false);
  });

  it('should start connecting on connectable target pointerdown', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    const e = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', e);

    expect(plugin.isConnecting()).toBe(true);
    expect(plugin.getSource()).toBe(node);
    expect(app.getState('connect:connecting')).toBe(true);
  });

  it('should emit connect:start event', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    const handler = vi.fn();
    app.bus.on('connect:start', handler);

    const e = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', e);

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as ConnectStartEvent;
    expect(payload.source).toBe(node);
  });

  it('should emit connect:move event on pointermove', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const src = createConnectableNode('n1', 100, 100, 50, 50);
    const tgt = createConnectableNode('n2', 300, 300, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    // Start connect
    const downE = createSimEvent('pointerdown', src, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);

    const handler = vi.fn();
    app.bus.on('connect:move', handler);

    // Move
    const moveE = createSimEvent('pointermove', src, {worldX: 200, worldY: 200});
    app.scene.emit('pointermove', moveE);

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as ConnectMoveEvent;
    expect(payload.source).toBe(src);
  });

  it('should cancel on pointerup in empty space', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);

    const downE = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Release in empty space (no snap target)
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(plugin.isConnecting()).toBe(false);
    expect(cancelHandler).toHaveBeenCalledOnce();
    expect(app.getState('connect:connecting')).toBe(false);
  });

  it('should cancel on Escape key', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);

    const downE = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

    expect(plugin.isConnecting()).toBe(false);
    expect(cancelHandler).toHaveBeenCalledOnce();
  });

  it('should complete connection via snap and create line in engine mode', () => {
    const {app} = createApp();
    const plugin = connectPlugin({snapRadius: 50});
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const tgt = createConnectableNode('n2', 200, 200, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    const completeHandler = vi.fn();
    app.bus.on('connect:complete', completeHandler);

    // Start from src
    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    // Move near target (within snap radius of [225, 225] center)
    const moveE = createSimEvent('pointermove', src, {worldX: 220, worldY: 220});
    app.scene.emit('pointermove', moveE);

    // Release (snap target should be found)
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(plugin.isConnecting()).toBe(false);
    expect(completeHandler).toHaveBeenCalledOnce();
    const payload = completeHandler.mock.calls[0][0] as ConnectCompleteEvent;
    expect(payload.source).toBe(src);
    expect(payload.target).toBe(tgt);

    // Should have created a line connection
    expect(plugin.getConnections()).toHaveLength(1);
    const conn = plugin.getConnections()[0];
    expect(conn.source).toBe(src);
    expect(conn.target).toBe(tgt);
  });

  it('should not allow self-loop by default', () => {
    const {app} = createApp();
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    // Start from node
    const downE = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);

    // Move to same node center area
    const moveE = createSimEvent('pointermove', node, {worldX: 126, worldY: 126});
    app.scene.emit('pointermove', moveE);

    // Release — should cancel, not complete
    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(cancelHandler).toHaveBeenCalledOnce();
    expect(plugin.getConnections()).toHaveLength(0);
  });

  it('should allow self-loop when configured', () => {
    const {app} = createApp();
    const plugin = connectPlugin({snapRadius: 100, allowSelfLoop: true});
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    const downE = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', downE);

    const moveE = createSimEvent('pointermove', node, {worldX: 126, worldY: 126});
    app.scene.emit('pointermove', moveE);

    const completeHandler = vi.fn();
    app.bus.on('connect:complete', completeHandler);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(completeHandler).toHaveBeenCalledOnce();
  });

  it('should remove connection by id', () => {
    const {app} = createApp();
    const plugin = connectPlugin({snapRadius: 50});
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const tgt = createConnectableNode('n2', 200, 200, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    // Create connection
    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', src, {worldX: 220, worldY: 220});
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
//  className 标记
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — className matching', () => {
  it('should use custom className', () => {
    const {app} = createApp();
    const plugin = connectPlugin({className: 'port'});
    app.use(plugin);

    const node = Node.create('rect', {fill: '#fff'});
    node.setClassName('port');
    app.scene.add(node);
    app.render();

    const e = createSimEvent('pointerdown', node, {worldX: 0, worldY: 0});
    app.scene.emit('pointerdown', e);

    expect(plugin.isConnecting()).toBe(true);
  });

  it('should walk up parent chain to find connectable', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const group = new Group();
    group.setClassName('connectable');
    const child = Node.create('rect', {fill: '#fff'});
    group.add(child);
    app.scene.add(group);
    app.render();

    const e = createSimEvent('pointerdown', child, {worldX: 0, worldY: 0});
    app.scene.emit('pointerdown', e);

    // Should find the parent group with 'connectable' className
    expect(plugin.isConnecting()).toBe(true);
    expect(plugin.getSource()).toBe(group);
  });
});

// ════════════════════════════════════════════════════════════
//  canConnect 过滤
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — canConnect filter', () => {
  it('should respect canConnect callback', () => {
    const {app} = createApp();
    const plugin = connectPlugin({
      snapRadius: 100,
      canConnect: (_src, tgt) => tgt.name !== 'blocked',
    });
    app.use(plugin);

    const src = createConnectableNode('src', 0, 0, 50, 50);
    const blocked = createConnectableNode('blocked', 100, 100, 50, 50);
    app.scene.add(src);
    app.scene.add(blocked);
    app.render();

    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    // Move near blocked target
    const moveE = createSimEvent('pointermove', src, {worldX: 125, worldY: 125});
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
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    const cancelHandler = vi.fn();
    app.bus.on('connect:cancel', cancelHandler);

    const downE = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
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
    const {app} = createApp();
    const plugin = connectPlugin({snapRadius: 50});
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const tgt = createConnectableNode('n2', 200, 200, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    // Create connection
    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', src, {worldX: 220, worldY: 220});
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
    const {app} = createApp();

    // Mock drag:dragging state manually
    // Since we don't have dragPlugin installed, we simulate the state
    // by installing a dummy plugin that declares the state
    const dummyDrag = {
      name: 'drag',
      state: [{key: 'drag:dragging', description: 'dragging', initial: false}],
      install() {},
    };
    app.use(dummyDrag);
    app.setState('drag:dragging', true);

    const plugin = connectPlugin();
    app.use(plugin);

    const node = createConnectableNode('n1', 100, 100, 50, 50);
    app.scene.add(node);
    app.render();

    const e = createSimEvent('pointerdown', node, {worldX: 125, worldY: 125});
    app.scene.emit('pointerdown', e);

    expect(plugin.isConnecting()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
//  锚点计算
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — custom anchor', () => {
  it('should use custom anchor function', () => {
    const {app} = createApp();
    const customAnchor = vi.fn(() => [999, 888] as [number, number]);
    const plugin = connectPlugin({
      anchor: customAnchor,
      snapRadius: 50,
    });
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    app.scene.add(src);
    app.render();

    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
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
    const {app} = createApp();
    const previewPath = vi.fn((source: [number, number], target: [number, number]) => `M${source[0]} ${source[1]}C${(source[0] + target[0]) / 2} ${source[1]},${(source[0] + target[0]) / 2} ${target[1]},${target[0]} ${target[1]}`);
    const plugin = connectPlugin({previewPath, snapRadius: 100});
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const tgt = createConnectableNode('n2', 200, 0, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    // Start connection
    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Move — should call previewPath
    const moveE = createSimEvent('pointermove', src, {worldX: 100, worldY: 25});
    app.scene.emit('pointermove', moveE);

    expect(previewPath).toHaveBeenCalled();
    const lastCall = previewPath.mock.calls[previewPath.mock.calls.length - 1];
    expect(lastCall[0]).toBeInstanceOf(Array); // source point
    expect(lastCall[1]).toBeInstanceOf(Array); // target point
  });

  it('should remove preview from layer on cancel', () => {
    const {app} = createApp();
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    app.scene.add(src);
    app.render();

    // Start connection
    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Move to show preview
    const moveE = createSimEvent('pointermove', src, {worldX: 100, worldY: 100});
    app.scene.emit('pointermove', moveE);

    // Cancel via pointerup without snap target
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(plugin.isConnecting()).toBe(false);

    // Preview line should be removed from layer (connect layer should have no children)
    const connectLayer = app.getLayer('connect');
    expect(connectLayer!.children.length).toBe(0);
  });

  it('should remove preview from layer on complete', () => {
    const {app} = createApp();
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const tgt = createConnectableNode('n2', 200, 0, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    // Start connection
    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    // Move to snap target
    const moveE = createSimEvent('pointermove', src, {worldX: 225, worldY: 25});
    app.scene.emit('pointermove', moveE);

    // Complete
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(plugin.isConnecting()).toBe(false);

    // Preview line should be removed from layer
    const connectLayer = app.getLayer('connect');
    expect(connectLayer!.children.length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════
//  Graph 集成
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — graph integration', () => {
  it('should resolve element ID via parent chain', () => {
    const {app} = createApp();

    // Create a mock graph plugin
    const elements = new Map<string, {id: string; role: string; data: Record<string, unknown>}>();
    elements.set('node-1', {id: 'node-1', role: 'node', data: {id: 'node-1', x: 0, y: 0}});

    const mockGraph = {
      name: 'graph',
      state: [{key: 'graph:elements', description: 'All element IDs', initial: []}],
      install() {},
      has(id: string) {
        return elements.has(id);
      },
      get(id: string) {
        return elements.get(id);
      },
      add: vi.fn((_type: string, _data: Record<string, unknown>) => {
        return {id: _data.id};
      }),
    };

    app.use(mockGraph);

    const plugin = connectPlugin({
      edgeType: 'edge',
      snapRadius: 100,
    });
    app.use(plugin);

    // Create group hierarchy that mimics graph element structure
    // group.name = 'node-1' (the element ID)
    const elementGroup = new Group();
    elementGroup.setName('node-1');

    const port = Node.create('rect', {fill: '#333'});
    port.setClassName('connectable');
    port.shape.from(0, 0, 10, 10);
    elementGroup.add(port);

    // Second element
    elements.set('node-2', {id: 'node-2', role: 'node', data: {id: 'node-2', x: 200, y: 200}});
    const elementGroup2 = new Group();
    elementGroup2.setName('node-2');
    elementGroup2.translate(200, 200);

    const port2 = Node.create('rect', {fill: '#333'});
    port2.setClassName('connectable');
    port2.shape.from(0, 0, 10, 10);
    elementGroup2.add(port2);

    app.scene.add(elementGroup);
    app.scene.add(elementGroup2);
    app.render();

    // Start from port (child of node-1 group)
    const downE = createSimEvent('pointerdown', port, {worldX: 5, worldY: 5});
    app.scene.emit('pointerdown', downE);

    expect(plugin.isConnecting()).toBe(true);

    // Move near port2
    const moveE = createSimEvent('pointermove', port, {worldX: 205, worldY: 205});
    app.scene.emit('pointermove', moveE);

    // Release
    window.dispatchEvent(new PointerEvent('pointerup'));

    // graph.add should have been called with auto-resolved element IDs
    expect(mockGraph.add).toHaveBeenCalledOnce();
    const edgeData = mockGraph.add.mock.calls[0][1] as Record<string, unknown>;
    expect(edgeData.source).toBe('node-1');
    expect(edgeData.target).toBe('node-2');
  });

  it('should use custom edgeFactory when provided', () => {
    const {app} = createApp();

    const mockGraph = {
      name: 'graph',
      state: [{key: 'graph:elements', description: 'All element IDs', initial: []}],
      install() {},
      has: () => false,
      get: () => undefined,
      add: vi.fn(),
    };
    app.use(mockGraph);

    const customFactory = vi.fn(() => ({
      id: 'custom-edge',
      source: 'custom-src',
      target: 'custom-tgt',
      color: '#ff0000',
    }));

    const plugin = connectPlugin({
      edgeType: 'edge',
      edgeFactory: customFactory,
      snapRadius: 100,
    });
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const tgt = createConnectableNode('n2', 100, 100, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);

    const moveE = createSimEvent('pointermove', src, {worldX: 125, worldY: 125});
    app.scene.emit('pointermove', moveE);

    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(customFactory).toHaveBeenCalledOnce();
    expect(mockGraph.add).toHaveBeenCalledWith('edge', {
      id: 'custom-edge',
      source: 'custom-src',
      target: 'custom-tgt',
      color: '#ff0000',
    });
  });

  it('should fall back to engine line when no edgeType is set', () => {
    const {app} = createApp();

    const mockGraph = {
      name: 'graph',
      state: [{key: 'graph:elements', description: 'All element IDs', initial: []}],
      install() {},
      has: () => false,
      get: () => undefined,
      add: vi.fn(),
    };
    app.use(mockGraph);

    // No edgeType set → even with graph present, should use engine line
    const plugin = connectPlugin({snapRadius: 100});
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const tgt = createConnectableNode('n2', 100, 100, 50, 50);
    app.scene.add(src);
    app.scene.add(tgt);
    app.render();

    const downE = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', src, {worldX: 125, worldY: 125});
    app.scene.emit('pointermove', moveE);
    window.dispatchEvent(new PointerEvent('pointerup'));

    // graph.add should NOT have been called
    expect(mockGraph.add).not.toHaveBeenCalled();
    // But engine line should have been created
    expect(plugin.getConnections()).toHaveLength(1);
  });

  it('should include port data as sourcePort/targetPort in default edge data', () => {
    const {app} = createApp();

    const elements = new Map<string, {id: string}>();
    elements.set('node-A', {id: 'node-A'});
    elements.set('node-B', {id: 'node-B'});

    const mockGraph = {
      name: 'graph',
      state: [{key: 'graph:elements', description: '', initial: []}],
      install() {},
      has: (id: string) => elements.has(id),
      add: vi.fn(),
    };
    app.use(mockGraph);

    const plugin = connectPlugin({edgeType: 'edge', snapRadius: 100});
    app.use(plugin);

    // Source port with metadata
    const groupA = new Group();
    groupA.setName('node-A');
    const portA = Node.create('rect', {fill: '#333'});
    portA.setClassName('connectable');
    portA.shape.from(0, 0, 10, 10);
    portA.data = {row: 'in1', side: 'right'};
    groupA.add(portA);

    // Target port with metadata
    const groupB = new Group();
    groupB.setName('node-B');
    groupB.translate(200, 200);
    const portB = Node.create('rect', {fill: '#333'});
    portB.setClassName('connectable');
    portB.shape.from(0, 0, 10, 10);
    portB.data = {row: 'src', side: 'left'};
    groupB.add(portB);

    app.scene.add(groupA);
    app.scene.add(groupB);
    app.render();

    const downE = createSimEvent('pointerdown', portA, {worldX: 5, worldY: 5});
    app.scene.emit('pointerdown', downE);
    const moveE = createSimEvent('pointermove', portA, {worldX: 205, worldY: 205});
    app.scene.emit('pointermove', moveE);
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(mockGraph.add).toHaveBeenCalledOnce();
    const edgeData = mockGraph.add.mock.calls[0][1] as Record<string, unknown>;
    expect(edgeData.source).toBe('node-A');
    expect(edgeData.target).toBe('node-B');
    expect(edgeData.sourcePort).toEqual({row: 'in1', side: 'right'});
    expect(edgeData.targetPort).toEqual({row: 'src', side: 'left'});
  });
});

// ════════════════════════════════════════════════════════════
//  边缘情况
// ════════════════════════════════════════════════════════════

describe('ConnectPlugin — edge cases', () => {
  it('should not start second connection while already connecting', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const src = createConnectableNode('n1', 0, 0, 50, 50);
    const other = createConnectableNode('n2', 200, 200, 50, 50);
    app.scene.add(src);
    app.scene.add(other);
    app.render();

    // Start first connection
    const e1 = createSimEvent('pointerdown', src, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', e1);
    expect(plugin.isConnecting()).toBe(true);
    expect(plugin.getSource()).toBe(src);

    // Try second connection — should be ignored
    const e2 = createSimEvent('pointerdown', other, {worldX: 225, worldY: 225});
    app.scene.emit('pointerdown', e2);
    expect(plugin.getSource()).toBe(src); // still first source
  });

  it('should dispose gracefully while connecting', () => {
    const {app} = createApp();
    const plugin = connectPlugin();
    app.use(plugin);

    const node = createConnectableNode('n1', 0, 0, 50, 50);
    app.scene.add(node);
    app.render();

    const downE = createSimEvent('pointerdown', node, {worldX: 25, worldY: 25});
    app.scene.emit('pointerdown', downE);
    expect(plugin.isConnecting()).toBe(true);

    // Dispose during connection — should not throw
    plugin.dispose();
    expect(plugin.isConnecting()).toBe(false);
  });
});
