import type {App, Plugin, RendxJSON} from 'rendx-engine';

export interface HistoryPluginOptions {
  /** 最大历史步数，默认 50 */
  maxSteps?: number;
}

const DEFAULTS: Required<HistoryPluginOptions> = {
  maxSteps: 50,
};

class HistoryPlugin implements Plugin {
  name = 'history';

  #app: App | null = null;
  #undoStack: RendxJSON[] = [];
  #redoStack: RendxJSON[] = [];
  #options: Required<HistoryPluginOptions>;

  constructor(options: HistoryPluginOptions = {}) {
    this.#options = {...DEFAULTS, ...options};
  }

  install(app: App) {
    this.#app = app;
  }

  /**
   * 保存当前场景快照到撤销栈。
   * 在每次用户操作完成后调用（如拖拽结束、属性修改等）。
   */
  push() {
    const app = this.#app;
    if (!app) return;

    this.#undoStack.push(app.toJSON());
    // 新操作清空重做栈
    this.#redoStack = [];

    // 超出上限时丢弃最早的记录
    if (this.#undoStack.length > this.#options.maxSteps) {
      this.#undoStack.shift();
    }
  }

  /**
   * 撤销：恢复到上一步快照。
   * @returns 是否成功执行撤销
   */
  undo(): boolean {
    const app = this.#app;
    if (!app || this.#undoStack.length === 0) return false;

    // 当前状态存入重做栈
    this.#redoStack.push(app.toJSON());

    // 恢复上一步
    const snapshot = this.#undoStack.pop()!;
    app.restoreFromJSON(snapshot);
    app.render();
    return true;
  }

  /**
   * 重做：恢复到最近一次被撤销的快照。
   * @returns 是否成功执行重做
   */
  redo(): boolean {
    const app = this.#app;
    if (!app || this.#redoStack.length === 0) return false;

    // 当前状态存入撤销栈
    this.#undoStack.push(app.toJSON());

    // 恢复重做状态
    const snapshot = this.#redoStack.pop()!;
    app.restoreFromJSON(snapshot);
    app.render();
    return true;
  }

  /** 是否可撤销 */
  get canUndo(): boolean {
    return this.#undoStack.length > 0;
  }

  /** 是否可重做 */
  get canRedo(): boolean {
    return this.#redoStack.length > 0;
  }

  /** 撤销栈长度 */
  get undoCount(): number {
    return this.#undoStack.length;
  }

  /** 重做栈长度 */
  get redoCount(): number {
    return this.#redoStack.length;
  }

  /** 清空所有历史记录 */
  reset() {
    this.#undoStack = [];
    this.#redoStack = [];
  }

  dispose() {
    this.reset();
    this.#app = null;
  }
}

/**
 * 创建历史记录插件（Undo / Redo）
 *
 * 基于场景快照实现，每次调用 `push()` 保存当前状态，
 * `undo()` / `redo()` 在快照间来回切换。
 *
 * @example
 * ```ts
 * import {historyPlugin} from 'rendx-history-plugin';
 *
 * const app = new App({width: 800, height: 600});
 * app.mount(container);
 *
 * const history = historyPlugin({maxSteps: 100});
 * app.use(history);
 *
 * // 用户操作前保存快照
 * history.push();
 * // ... 用户执行操作（添加节点、修改属性等）
 *
 * // 撤销
 * history.undo();  // → 恢复到上一步
 *
 * // 重做
 * history.redo();  // → 恢复到撤销前
 *
 * // 快捷键绑定
 * document.addEventListener('keydown', (e) => {
 *   if (e.metaKey && e.key === 'z') {
 *     e.shiftKey ? history.redo() : history.undo();
 *   }
 * });
 * ```
 */
export function historyPlugin(options?: HistoryPluginOptions): HistoryPlugin {
  return new HistoryPlugin(options);
}
