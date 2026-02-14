import {describe, it, expect, vi, beforeEach} from 'vitest';

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
    gradient() {}
    clipPath() {}
    rect() {}
    circle() {}
    line() {}
    text() {}
    path() {}
    image() {}
  },
}));
vi.mock('rendx-svg', () => ({
  SvgRenderer: class {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    resize() {}
    dispose() {}
    clear() {}
    save() {}
    restore() {}
    setTransform() {}
    setAttributes() {}
  },
}));

import {App} from '../src/app';
import {Node} from '../src/scene';

import type {Plugin} from '../src/plugin';
import type {DyeJSON} from '../src/serialization';

// ========================
// History Plugin inline（避免跨包依赖，直接在测试中实现同等逻辑）
// ========================

interface HistoryPluginOptions {
  maxSteps?: number;
}

class HistoryPlugin implements Plugin {
  name = 'history';
  #app: App | null = null;
  #undoStack: DyeJSON[] = [];
  #redoStack: DyeJSON[] = [];
  #options: Required<HistoryPluginOptions>;

  constructor(options: HistoryPluginOptions = {}) {
    this.#options = {maxSteps: 50, ...options};
  }

  install(app: App) {
    this.#app = app;
  }

  push() {
    const app = this.#app;
    if (!app) return;
    this.#undoStack.push(app.toJSON());
    this.#redoStack = [];
    if (this.#undoStack.length > this.#options.maxSteps) {
      this.#undoStack.shift();
    }
  }

  undo(): boolean {
    const app = this.#app;
    if (!app || this.#undoStack.length === 0) return false;
    this.#redoStack.push(app.toJSON());
    const snapshot = this.#undoStack.pop()!;
    app.restoreFromJSON(snapshot);
    app.render();
    return true;
  }

  redo(): boolean {
    const app = this.#app;
    if (!app || this.#redoStack.length === 0) return false;
    this.#undoStack.push(app.toJSON());
    const snapshot = this.#redoStack.pop()!;
    app.restoreFromJSON(snapshot);
    app.render();
    return true;
  }

  get canUndo() {
    return this.#undoStack.length > 0;
  }
  get canRedo() {
    return this.#redoStack.length > 0;
  }
  get undoCount() {
    return this.#undoStack.length;
  }
  get redoCount() {
    return this.#redoStack.length;
  }

  reset() {
    this.#undoStack = [];
    this.#redoStack = [];
  }

  dispose() {
    this.reset();
    this.#app = null;
  }
}

function historyPlugin(options?: HistoryPluginOptions): HistoryPlugin {
  return new HistoryPlugin(options);
}

// ========================
// Tests
// ========================

describe('restoreFromJSON - 就地恢复场景', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    return () => container.remove();
  });

  it('恢复后层和节点替换为新内容', () => {
    const app = new App({width: 100, height: 100});
    app.mount(container);

    // 添加节点
    const defaultLayer = app.getLayer('default')!;
    defaultLayer.add(Node.create('rect', {fill: 'red'}));
    defaultLayer.add(Node.create('circle', {fill: 'blue'}));

    // 保存快照
    const snapshot = app.toJSON();

    // 修改场景（添加更多节点）
    defaultLayer.add(Node.create('line', {stroke: 'green'}));
    expect(defaultLayer.getQueue().length).toBe(3);

    // 恢复
    app.restoreFromJSON(snapshot);
    const restored = app.getLayer('default')!;
    expect(restored.getQueue().length).toBe(2);

    app.dispose();
  });

  it('恢复后多层场景正确还原', () => {
    const app = new App({width: 100, height: 100});
    app.mount(container);

    // 添加额外层
    const bgLayer = app.addLayer('bg', -1);
    bgLayer.add(Node.create('rect', {fill: 'gray'}));
    app.getLayer('default')!.add(Node.create('circle', {fill: 'red'}));

    const snapshot = app.toJSON();
    expect(snapshot.layers.length).toBe(2); // bg + default

    // 清除并重新添加
    app.getLayer('default')!.add(Node.create('line', {stroke: 'black'}));

    app.restoreFromJSON(snapshot);

    // 验证层被恢复
    const restoredBg = app.getLayer('bg');
    const restoredDefault = app.getLayer('default');
    expect(restoredBg).toBeDefined();
    expect(restoredDefault).toBeDefined();
    expect(restoredDefault!.getQueue().length).toBe(1);
    expect(restoredBg!.getQueue().length).toBe(1);

    app.dispose();
  });

  it('恢复后挂载状态下 Canvas 元素挂入 DOM', () => {
    const app = new App({width: 100, height: 100});
    app.mount(container);

    const wrapper = app.container!;
    const snapshot = app.toJSON();

    app.restoreFromJSON(snapshot);

    // 恢复后 container 里应有 canvas 元素（层的 el）
    const canvases = wrapper.querySelectorAll('canvas');
    expect(canvases.length).toBeGreaterThanOrEqual(2); // default + event

    app.dispose();
  });
});

describe('History Plugin - 历史记录', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    return () => container.remove();
  });

  function createApp() {
    const app = new App({width: 100, height: 100});
    app.mount(container);
    const history = historyPlugin();
    app.use(history);
    return {app, history};
  }

  describe('push()', () => {
    it('push 后 canUndo 为 true', () => {
      const {app, history} = createApp();
      expect(history.canUndo).toBe(false);
      history.push();
      expect(history.canUndo).toBe(true);
      app.dispose();
    });

    it('push 清空 redo 栈', () => {
      const {app, history} = createApp();
      history.push();
      app.getLayer('default')!.add(Node.create('rect', {fill: 'red'}));
      history.push();
      history.undo();
      expect(history.canRedo).toBe(true);

      // 新操作清空 redo
      history.push();
      expect(history.canRedo).toBe(false);

      app.dispose();
    });

    it('超出 maxSteps 时丢弃最早记录', () => {
      const app = new App({width: 100, height: 100});
      app.mount(container);
      const history = historyPlugin({maxSteps: 3});
      app.use(history);

      for (let i = 0; i < 5; i++) {
        history.push();
      }
      expect(history.undoCount).toBe(3);

      app.dispose();
    });
  });

  describe('undo()', () => {
    it('无历史时返回 false', () => {
      const {app, history} = createApp();
      expect(history.undo()).toBe(false);
      app.dispose();
    });

    it('撤销恢复到上一步状态', () => {
      const {app, history} = createApp();
      const layer = app.getLayer('default')!;

      // 初始空状态
      history.push();

      // 添加节点
      layer.add(Node.create('rect', {fill: 'red'}));
      expect(layer.getQueue().length).toBe(1);

      // 撤销 → 回到空状态
      const result = history.undo();
      expect(result).toBe(true);

      const restored = app.getLayer('default')!;
      expect(restored.getQueue().length).toBe(0);

      app.dispose();
    });

    it('多步撤销', () => {
      const {app, history} = createApp();
      const layer = app.getLayer('default')!;

      // Step 0: 空
      history.push();

      // Step 1: 1 个节点
      layer.add(Node.create('rect', {fill: 'red'}));
      history.push();

      // Step 2: 2 个节点
      layer.add(Node.create('circle', {fill: 'blue'}));

      // undo → Step 1 (1 个节点)
      history.undo();
      expect(app.getLayer('default')!.getQueue().length).toBe(1);

      // undo → Step 0 (0 个节点)
      history.undo();
      expect(app.getLayer('default')!.getQueue().length).toBe(0);

      // 无更多历史
      expect(history.undo()).toBe(false);

      app.dispose();
    });
  });

  describe('redo()', () => {
    it('无重做时返回 false', () => {
      const {app, history} = createApp();
      expect(history.redo()).toBe(false);
      app.dispose();
    });

    it('undo 后 redo 恢复', () => {
      const {app, history} = createApp();
      const layer = app.getLayer('default')!;

      history.push();
      layer.add(Node.create('rect', {fill: 'red'}));

      history.undo();
      expect(app.getLayer('default')!.getQueue().length).toBe(0);
      expect(history.canRedo).toBe(true);

      history.redo();
      expect(app.getLayer('default')!.getQueue().length).toBe(1);

      app.dispose();
    });

    it('多步 undo + redo', () => {
      const {app, history} = createApp();
      const layer = app.getLayer('default')!;

      // Step 0: 空
      history.push();
      // Step 1: 1 rect
      layer.add(Node.create('rect', {fill: 'red'}));
      history.push();
      // Step 2: 1 rect + 1 circle
      layer.add(Node.create('circle', {fill: 'blue'}));

      // undo × 2 → Step 0
      history.undo();
      history.undo();
      expect(app.getLayer('default')!.getQueue().length).toBe(0);

      // redo × 2 → Step 2
      history.redo();
      expect(app.getLayer('default')!.getQueue().length).toBe(1);
      history.redo();
      expect(app.getLayer('default')!.getQueue().length).toBe(2);

      app.dispose();
    });
  });

  describe('reset()', () => {
    it('清空所有历史', () => {
      const {app, history} = createApp();
      history.push();
      history.push();
      history.undo();
      expect(history.undoCount).toBe(1);
      expect(history.redoCount).toBe(1);

      history.reset();
      expect(history.undoCount).toBe(0);
      expect(history.redoCount).toBe(0);
      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);

      app.dispose();
    });
  });

  describe('dispose()', () => {
    it('app.dispose 自动清理 history', () => {
      const {app, history} = createApp();
      history.push();
      history.push();
      app.dispose();
      expect(history.undoCount).toBe(0);
      expect(history.redoCount).toBe(0);
    });
  });
});
