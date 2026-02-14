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

import {App} from '../src/app';
import type {Plugin} from '../src/plugin';

describe('Plugin System - 插件系统', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    return () => {
      container.remove();
    };
  });

  function createPlugin(name = 'test-plugin'): Plugin & {installed: boolean; disposed: boolean; resized: [number, number] | null} {
    return {
      name,
      installed: false,
      disposed: false,
      resized: null,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      install(_app: App) {
        this.installed = true;
      },
      resize(w: number, h: number) {
        this.resized = [w, h];
      },
      dispose() {
        this.disposed = true;
      },
    };
  }

  describe('app.use()', () => {
    it('调用 plugin.install 并传入 app 实例', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      let receivedApp: App | null = null;
      const plugin: Plugin = {
        name: 'probe',
        install(a: App) {
          receivedApp = a;
        },
      };
      app.use(plugin);
      expect(receivedApp).toBe(app);
      app.dispose();
    });

    it('返回 app 实例（链式调用）', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const plugin = createPlugin();
      const result = app.use(plugin);
      expect(result).toBe(app);
      app.dispose();
    });

    it('同名插件不重复注册', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const p1 = createPlugin('dup');
      const p2 = createPlugin('dup');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      app.use(p1);
      app.use(p2);
      expect(p1.installed).toBe(true);
      expect(p2.installed).toBe(false);
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
      app.dispose();
    });

    it('可注册多个不同名插件', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const p1 = createPlugin('a');
      const p2 = createPlugin('b');
      app.use(p1).use(p2);
      expect(p1.installed).toBe(true);
      expect(p2.installed).toBe(true);
      app.dispose();
    });

    it('注册 state 声明并写入初始值', () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'state-test',
        state: [
          {key: 'state-test:count', description: '计数器', initial: 0},
          {key: 'state-test:items', description: '列表', initial: []},
        ],
        install() {},
      };
      app.use(plugin);
      expect(app.getState('state-test:count')).toBe(0);
      expect(app.getState('state-test:items')).toEqual([]);
      app.dispose();
    });

    it('state key 冲突时抛错', () => {
      const app = new App({width: 100, height: 100});
      const p1: Plugin = {
        name: 'alpha',
        state: [{key: 'shared:data', description: 'alpha data', initial: null}],
        install() {},
      };
      const p2: Plugin = {
        name: 'beta',
        state: [{key: 'shared:data', description: 'beta data', initial: null}],
        install() {},
      };
      app.use(p1);
      expect(() => app.use(p2)).toThrowError(/already declared by plugin "alpha"/);
      app.dispose();
    });

    it('自动 acquireLayer 创建声明的图层', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const plugin: Plugin = {
        name: 'layer-test',
        layers: [{name: '__interact__', zIndex: 99998}],
        install() {},
      };
      expect(app.getLayer('__interact__')).toBeUndefined();
      app.use(plugin);
      expect(app.getLayer('__interact__')).toBeDefined();
      app.dispose();
    });

    it('多个插件声明同名图层只创建一次', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const p1: Plugin = {
        name: 'sel',
        layers: [{name: '__interact__', zIndex: 99998}],
        install() {},
      };
      const p2: Plugin = {
        name: 'conn',
        layers: [{name: '__interact__', zIndex: 99998}],
        install() {},
      };
      app.use(p1);
      const layer = app.getLayer('__interact__');
      app.use(p2);
      expect(app.getLayer('__interact__')).toBe(layer);
      app.dispose();
    });
  });

  describe('app.getPlugin()', () => {
    it('获取已注册的插件', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const plugin = createPlugin('my-plugin');
      app.use(plugin);
      expect(app.getPlugin('my-plugin')).toBe(plugin);
      app.dispose();
    });

    it('获取不存在的插件返回 undefined', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      expect(app.getPlugin('nonexistent')).toBeUndefined();
      app.dispose();
    });
  });

  describe('plugin.resize()', () => {
    it('app.resize() 触发插件 resize', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const plugin = createPlugin();
      app.use(plugin);
      app.resize(200, 300);
      expect(plugin.resized).toEqual([200, 300]);
      app.dispose();
    });

    it('没有 resize 方法的插件不报错', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const plugin: Plugin = {
        name: 'no-resize',
        install() {},
      };
      app.use(plugin);
      expect(() => app.resize(200, 300)).not.toThrow();
      app.dispose();
    });
  });

  describe('plugin.dispose()', () => {
    it('app.dispose() 触发所有插件 dispose', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const p1 = createPlugin('a');
      const p2 = createPlugin('b');
      app.use(p1).use(p2);
      app.dispose();
      expect(p1.disposed).toBe(true);
      expect(p2.disposed).toBe(true);
    });

    it('没有 dispose 方法的插件不报错', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const plugin: Plugin = {
        name: 'no-dispose',
        install() {},
      };
      app.use(plugin);
      expect(() => app.dispose()).not.toThrow();
    });
  });

  describe('container / mounted', () => {
    it('挂载后 container 可访问', () => {
      const app = new App({width: 100, height: 100});
      expect(app.container).toBeNull();
      expect(app.mounted).toBe(false);
      app.mount(container);
      expect(app.container).toBeInstanceOf(HTMLDivElement);
      expect(app.mounted).toBe(true);
      app.dispose();
    });

    it('dispose 后 container 为 null', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      app.dispose();
      expect(app.container).toBeNull();
    });
  });

  // ========================
  // Centralized State
  // ========================
  describe('State Management - 中心化状态', () => {
    it('setState/getState 基本读写', () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'rw',
        state: [{key: 'rw:val', description: 'test value', initial: 'init'}],
        install() {},
      };
      app.use(plugin);
      expect(app.getState('rw:val')).toBe('init');

      app.setState('rw:val', 'updated');
      expect(app.getState('rw:val')).toBe('updated');
      app.dispose();
    });

    it('setState 写入立即可读（同步写入）', () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'sync',
        state: [{key: 'sync:x', description: '', initial: 0}],
        install() {},
      };
      app.use(plugin);

      app.setState('sync:x', 42);
      // 不需要 await，同步立即可读
      expect(app.getState('sync:x')).toBe(42);
      app.dispose();
    });

    it('未声明的 key setState 抛错', () => {
      const app = new App({width: 100, height: 100});
      expect(() => app.setState('unknown:key', 123)).toThrowError(/not declared by any plugin/);
      app.dispose();
    });

    it('未声明的 key getState 返回 undefined', () => {
      const app = new App({width: 100, height: 100});
      expect(app.getState('nonexistent')).toBeUndefined();
      app.dispose();
    });

    it('泛型类型推断', () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'typed',
        state: [{key: 'typed:list', description: '', initial: [1, 2, 3]}],
        install() {},
      };
      app.use(plugin);

      const list = app.getState<number[]>('typed:list');
      expect(list).toEqual([1, 2, 3]);
      app.dispose();
    });

    it('setState 触发异步批量通知（微任务）', async () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'notify',
        state: [
          {key: 'notify:a', description: '', initial: 0},
          {key: 'notify:b', description: '', initial: 0},
        ],
        install() {},
      };
      app.use(plugin);

      const handler = vi.fn();
      app.bus.on('state:notify:a', handler);

      app.setState('notify:a', 1);
      app.setState('notify:a', 2);
      app.setState('notify:a', 3);

      // 同步阶段不应触发
      expect(handler).not.toHaveBeenCalled();

      // 等微任务
      await Promise.resolve();

      // 三次 setState 只通知一次
      expect(handler).toHaveBeenCalledOnce();
      // 但此时 getState 返回最新值
      expect(app.getState('notify:a')).toBe(3);
      app.dispose();
    });

    it('不同 key 的 setState 在一次微任务中合并通知', async () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'batch',
        state: [
          {key: 'batch:x', description: '', initial: 0},
          {key: 'batch:y', description: '', initial: 0},
        ],
        install() {},
      };
      app.use(plugin);

      const handlerX = vi.fn();
      const handlerY = vi.fn();
      app.bus.on('state:batch:x', handlerX);
      app.bus.on('state:batch:y', handlerY);

      app.setState('batch:x', 10);
      app.setState('batch:y', 20);

      await Promise.resolve();

      expect(handlerX).toHaveBeenCalledOnce();
      expect(handlerY).toHaveBeenCalledOnce();
      app.dispose();
    });

    it('插件 A 写 state，插件 B 通过 bus 订阅读取', async () => {
      const app = new App({width: 100, height: 100});
      const pluginA: Plugin = {
        name: 'writer',
        state: [{key: 'writer:data', description: '共享数据', initial: null}],
        install() {},
      };
      app.use(pluginA);

      let receivedValue: unknown = undefined;
      const pluginB: Plugin = {
        name: 'reader',
        install(a: App) {
          a.bus.on('state:writer:data', () => {
            receivedValue = a.getState('writer:data');
          });
        },
      };
      app.use(pluginB);

      app.setState('writer:data', {nodes: [1, 2, 3]});

      await Promise.resolve();

      expect(receivedValue).toEqual({nodes: [1, 2, 3]});
      app.dispose();
    });
  });

  // ========================
  // dumpState
  // ========================
  describe('dumpState - 状态快照', () => {
    it('导出所有 state 的元信息', () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'dump-test',
        state: [
          {key: 'dump-test:a', description: '字段 A', initial: 1},
          {key: 'dump-test:b', description: '字段 B', initial: 'hello'},
        ],
        install() {},
      };
      app.use(plugin);
      app.setState('dump-test:a', 42);

      const snapshot = app.dumpState();
      expect(snapshot['dump-test:a']).toEqual({
        value: 42,
        owner: 'dump-test',
        description: '字段 A',
      });
      expect(snapshot['dump-test:b']).toEqual({
        value: 'hello',
        owner: 'dump-test',
        description: '字段 B',
      });
      app.dispose();
    });

    it('无 state 时返回空对象', () => {
      const app = new App({width: 100, height: 100});
      expect(app.dumpState()).toEqual({});
      app.dispose();
    });
  });

  // ========================
  // acquireLayer
  // ========================
  describe('acquireLayer - 图层获取/创建', () => {
    it('不存在的层创建新层', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      expect(app.getLayer('overlay')).toBeUndefined();

      const layer = app.acquireLayer('overlay', 100);
      expect(layer).toBeDefined();
      expect(layer.layerName).toBe('overlay');
      expect(layer.layerIndex).toBe(100);
      app.dispose();
    });

    it('已存在的层返回同一实例', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);

      const layer1 = app.acquireLayer('overlay', 100);
      const layer2 = app.acquireLayer('overlay', 200); // zIndex 不同但同名
      expect(layer1).toBe(layer2);
      app.dispose();
    });

    it('可获取内建 default 层', () => {
      const app = new App({width: 100, height: 100});
      const layer = app.acquireLayer('default', 0);
      expect(layer).toBeDefined();
      expect(layer.layerName).toBe('default');
      app.dispose();
    });
  });

  // ========================
  // Bus - 事件总线
  // ========================
  describe('Bus - 中心化事件总线', () => {
    it('bus.emit 发送纯信号', () => {
      const app = new App({width: 100, height: 100});
      const handler = vi.fn();
      app.bus.on('custom:event', handler);

      app.bus.emit('custom:event');

      expect(handler).toHaveBeenCalledOnce();
      // 纯信号，handler 不收到参数（设计约定）
      app.dispose();
    });

    it('dispose 清理 bus 所有监听', () => {
      const app = new App({width: 100, height: 100});
      const handler = vi.fn();
      app.bus.on('test', handler);
      app.dispose();

      // dispose 后 emit 不触发（因为 removeAllListeners）
      app.bus.emit('test');
      expect(handler).not.toHaveBeenCalled();
    });

    it('多个订阅者独立接收信号', () => {
      const app = new App({width: 100, height: 100});
      const h1 = vi.fn();
      const h2 = vi.fn();
      app.bus.on('signal', h1);
      app.bus.on('signal', h2);

      app.bus.emit('signal');

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
      app.dispose();
    });
  });

  // ========================
  // requestRender / frame 改进
  // ========================
  describe('requestRender - 渲染帧管理', () => {
    it('多次调用 requestRender 只注册一个 rAF', () => {
      const spy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);
      const app = new App({width: 100, height: 100});

      app.requestRender();
      app.requestRender();
      app.requestRender();

      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
      app.dispose();
    });
  });

  // ========================
  // Plugin serialize / deserialize
  // ========================
  describe('Plugin serialize/deserialize', () => {
    it('插件可实现 serialize/deserialize 用于持久化', () => {
      const app = new App({width: 100, height: 100});

      let internalState = {mode: 'default'};
      const plugin: Plugin = {
        name: 'persistable',
        install() {},
        serialize() {
          return {...internalState};
        },
        deserialize(data: Record<string, unknown>) {
          internalState = data as typeof internalState;
        },
      };

      app.use(plugin);

      // serialize
      const data = plugin.serialize!();
      expect(data).toEqual({mode: 'default'});

      // modify & deserialize
      plugin.deserialize!({mode: 'edit'});
      expect(plugin.serialize!()).toEqual({mode: 'edit'});

      app.dispose();
    });

    it('没有 serialize/deserialize 的插件兼容（向后兼容）', () => {
      const app = new App({width: 100, height: 100});
      const plugin: Plugin = {
        name: 'simple',
        install() {},
      };
      app.use(plugin);
      expect(plugin.serialize).toBeUndefined();
      expect(plugin.deserialize).toBeUndefined();
      app.dispose();
    });
  });

  // ========================
  // 完整集成场景
  // ========================
  describe('Integration - 完整集成场景', () => {
    it('两个插件通过 state + bus 解耦通信', async () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);

      // 模拟 selection 插件
      const selection: Plugin = {
        name: 'selection',
        state: [{key: 'selection:nodes', description: '选中节点', initial: []}],
        install() {},
      };

      // 模拟 connector 插件
      let highlightedPorts: unknown[] = [];
      const connector: Plugin = {
        name: 'connector',
        install(a: App) {
          a.bus.on('state:selection:nodes', () => {
            const nodes = a.getState<string[]>('selection:nodes') ?? [];
            highlightedPorts = nodes.map(n => `port-${n}`);
          });
        },
      };

      app.use(selection).use(connector);

      // selection 插件更新状态
      app.setState('selection:nodes', ['node-1', 'node-2']);

      await Promise.resolve();

      // connector 自动响应
      expect(highlightedPorts).toEqual(['port-node-1', 'port-node-2']);
      app.dispose();
    });

    it('插件声明图层 + state 的完整 use 流程', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);

      const plugin: Plugin = {
        name: 'full',
        state: [{key: 'full:active', description: '激活状态', initial: false}],
        layers: [{name: '__interact__', zIndex: 99998}],
        install(a: App) {
          // install 时图层和 state 已就绪
          expect(a.getLayer('__interact__')).toBeDefined();
          expect(a.getState('full:active')).toBe(false);
        },
      };

      app.use(plugin);

      // 验证 state 和图层都正确注册
      expect(app.getState('full:active')).toBe(false);
      expect(app.getLayer('__interact__')).toBeDefined();

      // dumpState 包含元信息
      const dump = app.dumpState();
      expect(dump['full:active'].owner).toBe('full');
      expect(dump['full:active'].description).toBe('激活状态');

      app.dispose();
    });

    it('dispose 清理一切：plugins + bus + state', async () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);

      const busHandler = vi.fn();
      const plugin: Plugin = {
        name: 'cleanup-test',
        state: [{key: 'cleanup-test:val', description: '', initial: 1}],
        install(a: App) {
          a.bus.on('state:cleanup-test:val', busHandler);
        },
        dispose() {},
      };

      app.use(plugin);
      app.dispose();

      // dispose 后 state 被清空
      expect(app.getState('cleanup-test:val')).toBeUndefined();
      expect(app.dumpState()).toEqual({});

      // dispose 后 bus 不再触发
      app.bus.emit('state:cleanup-test:val');
      expect(busHandler).not.toHaveBeenCalled();
    });
  });
});
