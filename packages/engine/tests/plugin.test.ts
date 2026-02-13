import {describe, it, expect, vi, beforeEach} from 'vitest';

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
});
