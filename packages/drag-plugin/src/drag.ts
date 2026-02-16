import {applyConstraint} from './constraint';

import type {App, Plugin, Graphics, SimulatedEvent} from 'rendx-engine';
import type {Point} from 'rendx-core';
import type {DragPluginOptions, DragConstraint, DragSnapshot, DragStartEvent, DragMoveEvent, DragEndEvent, DragCancelEvent} from './types';

// ── 默认值 ───────────────────────────────────────────────

const DEFAULT_THRESHOLD = 3;
const DEFAULT_CURSOR = 'grabbing';

// ── 状态枚举 ─────────────────────────────────────────────

const enum DragState {
  Idle,
  Pending,
  Dragging,
}

// ── 内部完整配置 ─────────────────────────────────────────

interface ResolvedOptions {
  hitDelegate: ((target: Graphics) => Graphics | null) | null;
  filter: ((target: Graphics) => boolean) | null;
  enableGroupDrag: boolean;
  constraint: DragConstraint | undefined;
  threshold: number;
  cursor: string;
  applyPosition: ((target: Graphics, newX: number, newY: number, delta: Point) => void) | null;
}

// ════════════════════════════════════════════════════════════
//  DragPlugin
// ════════════════════════════════════════════════════════════

export class DragPlugin implements Plugin {
  readonly name = 'drag';

  readonly state = [
    {key: 'drag:dragging', description: '是否正在拖拽', initial: false},
    {key: 'drag:targets', description: '当前拖拽目标列表', initial: [] as Graphics[]},
  ];

  // ── 私有字段 ──

  #app: App | null = null;
  #opts: ResolvedOptions;

  /** 状态机 */
  #state: DragState = DragState.Idle;

  /** 当前拖拽目标集合 */
  #targets: Graphics[] = [];

  /** 起始世界坐标（pointerdown 时记录，场景坐标系） */
  #originWorld: Point = [0, 0];

  /** 上一帧世界坐标 */
  #lastWorld: Point = [0, 0];

  /** 累计总增量 */
  #totalDelta: Point = [0, 0];

  /** 各目标的起始位置快照 */
  #snapshots: DragSnapshot[] = [];

  /** 框选结束后跳过下一次 click 事件 */
  #skipNextClick = false;

  /** 清理回调 */
  #cleanups: (() => void)[] = [];

  // ──────────────────────────────────────────────────────────

  constructor(options: DragPluginOptions = {}) {
    this.#opts = {
      hitDelegate: options.hitDelegate ?? null,
      filter: options.filter ?? null,
      enableGroupDrag: options.enableGroupDrag ?? true,
      constraint: options.constraint,
      threshold: options.threshold ?? DEFAULT_THRESHOLD,
      cursor: options.cursor ?? DEFAULT_CURSOR,
      applyPosition: options.applyPosition ?? null,
    };
  }

  // ════════════════════════════════════════════════════════════
  //  Plugin lifecycle
  // ════════════════════════════════════════════════════════════

  install(app: App) {
    this.#app = app;

    // 注册到交互管理器
    app.interaction.register('drag', {channels: ['pointer-exclusive'], priority: 10});

    this.#bindEvents();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resize(_w: number, _h: number) {
    // 无需处理
  }

  dispose() {
    // 如果正在拖拽中，取消
    if (this.#state === DragState.Dragging) {
      this.#cancel();
    }

    for (const fn of this.#cleanups) fn();
    this.#cleanups = [];

    this.#app?.interaction.unregister('drag');
    this.#app?.resetCursor();
    this.#reset();
    this.#app = null;
  }

  // ════════════════════════════════════════════════════════════
  //  Public API
  // ════════════════════════════════════════════════════════════

  /** 当前是否正在拖拽 */
  isDragging(): boolean {
    return this.#state === DragState.Dragging;
  }

  /** 获取当前拖拽目标列表（只读副本） */
  getTargets(): readonly Graphics[] {
    return this.#targets;
  }

  /** 编程式取消当前拖拽 */
  cancel(): void {
    if (this.#state === DragState.Dragging) {
      this.#cancel();
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 事件绑定
  // ════════════════════════════════════════════════════════════

  #bindEvents() {
    const scene = this.#app!.scene;

    scene.on('pointerdown', this.#onPointerDown);
    this.#cleanups.push(() => scene.off('pointerdown', this.#onPointerDown));

    scene.on('pointermove', this.#onPointerMove);
    this.#cleanups.push(() => scene.off('pointermove', this.#onPointerMove));

    // pointerup 绑到 window（鼠标移出画布后松手也能结束拖拽）
    window.addEventListener('pointerup', this.#onPointerUp);
    this.#cleanups.push(() => window.removeEventListener('pointerup', this.#onPointerUp));

    // Escape 取消
    window.addEventListener('keydown', this.#onKeyDown);
    this.#cleanups.push(() => window.removeEventListener('keydown', this.#onKeyDown));

    // 吞掉拖拽结束后的 click 事件
    scene.on('click', this.#onClick);
    this.#cleanups.push(() => scene.off('click', this.#onClick));
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 事件回调
  // ════════════════════════════════════════════════════════════

  #onClick = () => {
    if (this.#skipNextClick) {
      this.#skipNextClick = false;
    }
  };

  #onPointerDown = (e: SimulatedEvent) => {
    if (this.#state !== DragState.Idle) return;

    // 通道锁检查：pointer-exclusive 被其他插件占用时跳过
    if (this.#app!.interaction.isLockedByOther('pointer-exclusive', 'drag')) return;

    // 解析拖拽目标
    const hit = this.#resolve(e.target);
    if (!hit) return;

    // 确定拖拽集合
    this.#targets = this.#resolveDragGroup(hit);
    if (this.#targets.length === 0) return;

    // 记录起点
    this.#originWorld = [e.worldX, e.worldY];
    this.#lastWorld = [e.worldX, e.worldY];
    this.#totalDelta = [0, 0];

    // 快照（用于 cancel 回滚和 drag:end 负载）
    this.#snapshots = this.#targets.map(t => this.#captureSnapshot(t));

    // 进入 pending 状态
    this.#state = DragState.Pending;
  };

  #onPointerMove = (e: SimulatedEvent) => {
    if (this.#state === DragState.Idle) return;

    const worldX = e.worldX;
    const worldY = e.worldY;

    if (this.#state === DragState.Pending) {
      // 检测是否超过 threshold
      const dx = worldX - this.#originWorld[0];
      const dy = worldY - this.#originWorld[1];
      if (Math.abs(dx) < this.#opts.threshold && Math.abs(dy) < this.#opts.threshold) {
        return;
      }

      // 进入 dragging
      this.#state = DragState.Dragging;

      // 获取 pointer-exclusive 通道锁
      if (!this.#app!.interaction.acquire('pointer-exclusive', 'drag')) {
        // 无法获取锁（更高优先级插件持有），放弃拖拽
        this.#reset();
        return;
      }

      this.#app!.setCursor(this.#opts.cursor);
      this.#app!.setState('drag:dragging', true);
      this.#app!.setState('drag:targets', [...this.#targets]);

      this.#app!.bus.emit('drag:start', {
        targets: [...this.#targets],
        origin: [...this.#originWorld],
      } satisfies DragStartEvent);
    }

    if (this.#state === DragState.Dragging) {
      this.#applyDrag(worldX, worldY);
    }
  };

  #onPointerUp = () => {
    if (this.#state === DragState.Pending) {
      // 没超过 threshold，不算拖拽，静默复位
      this.#reset();
      return;
    }

    if (this.#state === DragState.Dragging) {
      this.#finish();
    }
  };

  #onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.#state === DragState.Dragging) {
      this.#cancel();
    }
  };

  // ════════════════════════════════════════════════════════════
  //  Internal — 拖拽操作
  // ════════════════════════════════════════════════════════════

  /**
   * 应用拖拽：计算增量、约束、写入位置
   */
  #applyDrag(worldX: number, worldY: number) {
    const frameDx = worldX - this.#lastWorld[0];
    const frameDy = worldY - this.#lastWorld[1];

    this.#lastWorld = [worldX, worldY];
    this.#totalDelta = [worldX - this.#originWorld[0], worldY - this.#originWorld[1]];

    // 对每个目标基于各自快照 + 总增量计算最终位置
    for (let i = 0; i < this.#targets.length; i++) {
      const target = this.#targets[i];
      const snap = this.#snapshots[i];

      const [finalX, finalY] = applyConstraint(snap.x, snap.y, this.#totalDelta[0], this.#totalDelta[1], this.#opts.constraint);

      const dx = finalX - target.translation[0];
      const dy = finalY - target.translation[1];

      this.#writePosition(target, finalX, finalY, [dx, dy]);
    }

    this.#app!.requestRender();
    this.#refreshSelectionOverlay();

    this.#app!.bus.emit('drag:move', {
      targets: [...this.#targets],
      delta: [frameDx, frameDy] as Point,
      totalDelta: [...this.#totalDelta] as Point,
    } satisfies DragMoveEvent);
  }

  /**
   * 完成拖拽
   */
  #finish() {
    const endPositions = this.#targets.map(t => this.#captureSnapshot(t));

    this.#refreshSelectionOverlay();

    this.#app!.bus.emit('drag:end', {
      targets: [...this.#targets],
      totalDelta: [...this.#totalDelta] as Point,
      startPositions: [...this.#snapshots],
      endPositions,
    } satisfies DragEndEvent);

    this.#skipNextClick = true;
    this.#cleanup();
  }

  /**
   * 取消拖拽 — 回滚到快照位置
   */
  #cancel() {
    // 回滚
    for (let i = 0; i < this.#targets.length; i++) {
      const target = this.#targets[i];
      const snap = this.#snapshots[i];
      this.#writePosition(target, snap.x, snap.y, [snap.x - target.translation[0], snap.y - target.translation[1]]);
    }

    this.#app!.requestRender();
    this.#refreshSelectionOverlay();

    this.#app!.bus.emit('drag:cancel', {
      targets: [...this.#targets],
    } satisfies DragCancelEvent);

    this.#cleanup();
  }

  /**
   * 拖拽结束后的通用清理
   */
  #cleanup() {
    this.#app!.interaction.release('pointer-exclusive', 'drag');
    this.#app!.resetCursor();
    this.#app!.setState('drag:dragging', false);
    this.#app!.setState('drag:targets', []);
    this.#reset();
  }

  /**
   * 复位内部状态（不涉及 app 状态）
   */
  #reset() {
    this.#state = DragState.Idle;
    this.#targets = [];
    this.#snapshots = [];
    this.#originWorld = [0, 0];
    this.#lastWorld = [0, 0];
    this.#totalDelta = [0, 0];
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 目标解析
  // ════════════════════════════════════════════════════════════

  /**
   * hitDelegate + filter 解析拖拽目标
   */
  #resolve(target: Graphics): Graphics | null {
    if (target === this.#app!.scene) return null;
    const resolved = this.#opts.hitDelegate ? this.#opts.hitDelegate(target) : target;
    if (!resolved) return null;
    if (this.#opts.filter && !this.#opts.filter(resolved)) return null;

    // 通过 InteractionManager 查询 draggable trait
    const traits = this.#app!.interaction.queryTraits(resolved);
    if (traits.draggable === false) return null;

    return resolved;
  }

  /**
   * 确定拖拽集合：
   * - enableGroupDrag + selection-plugin → 拖拽所有已选节点
   * - 否则 → 仅拖拽当前节点
   */
  #resolveDragGroup(hit: Graphics): Graphics[] {
    if (this.#opts.enableGroupDrag) {
      try {
        const selected = this.#app!.getState<Graphics[]>('selection:selected');
        if (selected && Array.isArray(selected) && selected.length > 0) {
          // 命中节点在选中集中 → 拖拽整个选中集
          if (selected.includes(hit)) {
            // 对选中集合应用 filter + traits，排除不可拖拽的元素（如 edge）
            // 避免 edge group 被施加 translate 导致渲染错位
            const filtered = selected.filter(t => {
              if (this.#opts.filter && !this.#opts.filter(t)) return false;
              const traits = this.#app!.interaction.queryTraits(t);
              if (traits.draggable === false) return false;
              return true;
            });
            return filtered.length > 0 ? filtered : [hit];
          }
        }
      } catch {
        // selection:selected state 未声明（未安装 selection-plugin），忽略
      }
    }

    return [hit];
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 位置读写
  // ════════════════════════════════════════════════════════════

  /**
   * 记录目标当前位置快照
   */
  #captureSnapshot(target: Graphics): DragSnapshot {
    // 优先从 graph-plugin 读 element data（更精确的业务坐标）
    const graphData = this.#getGraphElementData(target);
    if (graphData) {
      return {target, x: graphData.x, y: graphData.y};
    }

    // 纯 engine 场景：从 translation 读
    return {
      target,
      x: target.translation[0],
      y: target.translation[1],
    };
  }

  /**
   * 写入位置到目标
   */
  #writePosition(target: Graphics, newX: number, newY: number, delta: Point) {
    // 用户自定义 applyPosition
    if (this.#opts.applyPosition) {
      this.#opts.applyPosition(target, newX, newY, delta);
      return;
    }

    // 自动检测 graph-plugin
    const el = this.#getGraphElement(target);
    if (el) {
      // graph 模式：通过 element.update 写入，自动触发依赖 edge 重绘
      el.update({x: newX, y: newY});
      return;
    }

    // 纯 engine 模式：直接 translate
    target.translate(newX, newY);
  }

  /**
   * 感知 selection-plugin：刷新选框 overlay 位置
   */
  #refreshSelectionOverlay() {
    if (!this.#app) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sel = this.#app.getPlugin('selection') as any;
    if (sel && typeof sel.refreshOverlay === 'function') {
      sel.refreshOverlay();
    }
  }

  /**
   * 尝试从 graph-plugin 获取目标对应的 element 实例（无 graph-plugin 返回 null）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #getGraphElement(target: Graphics): any | null {
    if (!this.#app) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = this.#app.getPlugin('graph') as any;
    if (!graph || typeof graph.get !== 'function') return null;

    const el = graph.get(target.name);
    if (el && el.role === 'node') return el;

    return null;
  }

  /**
   * 尝试从 graph-plugin 读取 element 的 data（x, y）
   */
  #getGraphElementData(target: Graphics): {x: number; y: number} | null {
    const el = this.#getGraphElement(target);
    if (!el) return null;
    const data = el.data;
    if (data && typeof data.x === 'number' && typeof data.y === 'number') {
      return {x: data.x, y: data.y};
    }
    return null;
  }
}

// ── 工厂函数 ──────────────────────────────────────────────

export function dragPlugin(options?: DragPluginOptions): DragPlugin {
  return new DragPlugin(options);
}
