/**
 * 调度器 — 协调状态通知与渲染帧
 *
 * - state 变更通知：批量到微任务（同一事件循环内多次 setState 只通知一次）
 * - 渲染帧：幂等 rAF，从不 cancel，通过 dirty 标记决定是否续帧
 */
export class Scheduler {
  #pendingState = new Set<string>();
  #microTaskQueued = false;
  #onFlush: (keys: Set<string>) => void;

  constructor(onFlush: (keys: Set<string>) => void) {
    this.#onFlush = onFlush;
  }

  /**
   * 标记 state key 变更，批量到微任务统一通知。
   * 同一轮微任务内多次调用同一 key 只通知一次。
   */
  markState(key: string) {
    this.#pendingState.add(key);
    if (!this.#microTaskQueued) {
      this.#microTaskQueued = true;
      queueMicrotask(() => {
        this.#microTaskQueued = false;
        const keys = new Set(this.#pendingState);
        this.#pendingState.clear();
        this.#onFlush(keys);
      });
    }
  }

  /** 是否有待通知的 state 变更 */
  get hasPending(): boolean {
    return this.#pendingState.size > 0;
  }

  /** 清空待通知队列（用于 dispose） */
  clear() {
    this.#pendingState.clear();
    this.#microTaskQueued = false;
  }
}
