import {BoundingBox} from 'rendx-bounding';

import {getWorldBBox} from './bbox';

import {Group, Node} from 'rendx-engine';

import type {App, Plugin, Graphics, SimulatedEvent} from 'rendx-engine';
import type {Point} from 'rendx-core';
import type {SelectionPluginOptions, SelectionBoxStyle, HoverStyle, MarqueeStyle, SelectionChangeEvent, HoverChangeEvent} from './types';

// ── 默认样式 ─────────────────────────────────────────────

const DEFAULT_SELECTION_STYLE: Required<SelectionBoxStyle> = {
  stroke: '#1890ff',
  strokeWidth: 2,
  strokeDasharray: '6, 3',
  fill: 'transparent',
  padding: 2,
};

const DEFAULT_HOVER_STYLE: Required<HoverStyle> = {
  stroke: '#1890ff',
  strokeWidth: 1,
  strokeDasharray: '4, 2',
  fill: 'transparent',
  padding: 2,
};

const DEFAULT_MARQUEE_STYLE: Required<MarqueeStyle> = {
  stroke: '#1890ff',
  strokeWidth: 1,
  strokeDasharray: '4, 2',
  fill: 'rgba(24,144,255,0.08)',
};

// ── 最小拖拽距离（px），防止点击误触框选 ──
const DRAG_THRESHOLD = 3;

// ── 内部完整配置 ─────────────────────────────────────────

interface ResolvedOptions {
  selectionStyle: Required<SelectionBoxStyle>;
  hoverStyle: Required<HoverStyle>;
  marqueeStyle: Required<MarqueeStyle>;
  enableHover: boolean;
  enableMultiSelect: boolean;
  enableMarquee: boolean;
  zIndex: number;
  hitDelegate: ((target: Graphics) => Graphics | null) | null;
  filter: ((target: Graphics) => boolean) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderOverlay: ((target: Graphics, type: 'selection' | 'hover') => any | null) | null;
}

// ════════════════════════════════════════════════════════════
//  SelectionPlugin
// ════════════════════════════════════════════════════════════

export class SelectionPlugin implements Plugin {
  readonly name = 'selection';

  readonly state = [
    {key: 'selection:selected', description: '当前选中的节点列表', initial: [] as Graphics[]},
    {key: 'selection:hovering', description: '当前悬停的节点', initial: null as Graphics | null},
  ];

  get layers() {
    return [{name: 'selection', zIndex: this.#opts.zIndex}];
  }

  // ── 私有字段 ──

  #app: App | null = null;
  #opts: ResolvedOptions;

  /** 当前选中列表 */
  #selected: Graphics[] = [];
  /** 当前悬停节点 */
  #hovering: Graphics | null = null;

  // ── 框选拖拽状态 ──
  #isDragging = false;
  #dragStartOffset: Point | null = null;
  #lastDragOffset: Point | null = null;
  /** 框选完成后跳过下一次 click 事件 */
  #skipNextClick = false;

  // ── 场景图覆盖节点 ──
  #boxGroup: Group | null = null;
  #hoverGroup: Group | null = null;
  #marqueeNode: Node | null = null;

  // ── 清理回调 ──
  #cleanups: (() => void)[] = [];

  // ──────────────────────────────────────────────────────────

  constructor(options: SelectionPluginOptions = {}) {
    this.#opts = {
      selectionStyle: {...DEFAULT_SELECTION_STYLE, ...options.selectionStyle},
      hoverStyle: {...DEFAULT_HOVER_STYLE, ...options.hoverStyle},
      marqueeStyle: {...DEFAULT_MARQUEE_STYLE, ...options.marqueeStyle},
      enableHover: options.enableHover ?? false,
      enableMultiSelect: options.enableMultiSelect ?? true,
      enableMarquee: options.enableMarquee ?? false,
      zIndex: options.zIndex ?? 10,
      hitDelegate: options.hitDelegate ?? null,
      filter: options.filter ?? null,
      renderOverlay: options.renderOverlay ?? null,
    };
  }

  // ════════════════════════════════════════════════════════════
  //  Plugin lifecycle
  // ════════════════════════════════════════════════════════════

  install(app: App) {
    this.#app = app;

    const layer = app.getLayer('selection');
    if (!layer) {
      throw new Error('[rendx-selection-plugin] Layer "selection" not acquired. ' + 'Ensure the plugin is installed via app.use() so layers are auto-created.');
    }

    // 不参与命中检测 — 选框层仅做视觉装饰
    layer.setPointerEvents(false);
    // 不裁剪 — overlay 始终绘制
    layer.culling = false;

    // ── 创建几何容器 ──
    this.#boxGroup = this.#createGroup('__sel_boxes__');
    this.#hoverGroup = this.#createGroup('__sel_hover__');
    layer.add(this.#boxGroup);
    layer.add(this.#hoverGroup);

    // ── 框选矩形（默认隐藏） ──
    this.#marqueeNode = this.#createOverlayRect(this.#opts.marqueeStyle);
    this.#marqueeNode.setDisplay(false);
    layer.add(this.#marqueeNode);

    // ── 事件绑定 ──
    this.#bindEvents();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resize(_w: number, _h: number) {
    // 层的 resize 由 App 统一处理
  }

  dispose() {
    for (const fn of this.#cleanups) fn();
    this.#cleanups = [];

    this.#boxGroup?.removeChildren();
    this.#hoverGroup?.removeChildren();
    if (this.#marqueeNode) this.#marqueeNode.setDisplay(false);

    this.#app?.resetCursor();
    this.#selected = [];
    this.#hovering = null;
    this.#app = null;
  }

  // ── 序列化 / 反序列化（供 history-plugin 等消费） ──

  /**
   * 选中状态是临时交互态，不序列化具体内容。
   * 返回空对象让 history-plugin 识别到该插件并在 restore 时调用 deserialize。
   */
  serialize(): Record<string, unknown> {
    return {};
  }

  /**
   * 场景快照恢复后重建 overlay 层。
   *
   * restoreFromJSON 会移除旧的 "selection" Layer 并反序列化出新 Layer，
   * 导致插件持有的 #boxGroup / #hoverGroup / #marqueeNode 引用失效。
   * 此方法：
   * 1. 清空选中 / 悬停状态
   * 2. 获取新 "selection" Layer 并清除反序列化残留
   * 3. 重建 overlay 容器并挂载
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deserialize(_data: Record<string, unknown>) {
    if (!this.#app) return;

    // 1. 清空交互状态
    this.#selected = [];
    this.#hovering = null;
    this.#isDragging = false;
    this.#dragStartOffset = null;
    this.#lastDragOffset = null;
    this.#skipNextClick = false;
    this.#syncState();
    this.#app.setState('selection:hovering', null);

    // 2. 获取新 layer 并清除残留
    const layer = this.#app.getLayer('selection');
    if (!layer) return;

    layer.setPointerEvents(false);
    layer.culling = false;
    layer.removeChildren();

    // 3. 重建 overlay 容器
    this.#boxGroup = this.#createGroup('__sel_boxes__');
    this.#hoverGroup = this.#createGroup('__sel_hover__');
    layer.add(this.#boxGroup);
    layer.add(this.#hoverGroup);

    this.#marqueeNode = this.#createOverlayRect(this.#opts.marqueeStyle);
    this.#marqueeNode.setDisplay(false);
    layer.add(this.#marqueeNode);

    // 4. 触发 selection:change 通知外部（如 info-panel）
    this.#emitSelectionChange([], []);
  }

  // ════════════════════════════════════════════════════════════
  //  Public API
  // ════════════════════════════════════════════════════════════

  /** 获取当前选中列表（只读副本） */
  getSelected(): readonly Graphics[] {
    return this.#selected;
  }

  /** 获取当前悬停节点 */
  getHovering(): Graphics | null {
    return this.#hovering;
  }

  /** 编程式设置选中列表 */
  select(targets: Graphics[]) {
    const filtered = this.#applyFilter(targets);
    const added = filtered.filter(t => !this.#selected.includes(t));
    const removed = this.#selected.filter(t => !filtered.includes(t));
    if (!added.length && !removed.length) return;

    this.#selected = filtered;
    this.#syncState();
    this.#updateOverlay();
    this.#emitSelectionChange(added, removed);
  }

  /** 刷新 overlay（供外部插件在位置变化后调用） */
  refreshOverlay() {
    this.#updateOverlay();
  }

  /** 编程式清空选中 */
  clearSelection() {
    if (!this.#selected.length) return;
    const removed = [...this.#selected];
    this.#selected = [];
    this.#syncState();
    this.#updateOverlay();
    this.#emitSelectionChange([], removed);
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 事件绑定
  // ════════════════════════════════════════════════════════════

  #bindEvents() {
    const scene = this.#app!.scene;

    // click 始终监听（选中 / 切换 / 清空）
    scene.on('click', this.#onClick);
    this.#cleanups.push(() => scene.off('click', this.#onClick));

    // pointermove: hover 和 marquee 都需要，统一绑定
    if (this.#opts.enableHover || this.#opts.enableMarquee) {
      scene.on('pointermove', this.#onPointerMove);
      this.#cleanups.push(() => scene.off('pointermove', this.#onPointerMove));
    }

    // marquee 专用：pointerdown + window pointerup
    if (this.#opts.enableMarquee) {
      scene.on('pointerdown', this.#onPointerDown);
      this.#cleanups.push(() => scene.off('pointerdown', this.#onPointerDown));

      const onUp = this.#onPointerUp;
      window.addEventListener('pointerup', onUp);
      this.#cleanups.push(() => window.removeEventListener('pointerup', onUp));
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 事件回调
  // ════════════════════════════════════════════════════════════

  #onClick = (e: SimulatedEvent) => {
    // 框选拖拽后的 click → 跳过
    if (this.#skipNextClick) {
      this.#skipNextClick = false;
      return;
    }

    // 其他插件交互进行中 → 跳过
    if (this.#isOtherPluginBusy()) return;

    const hit = this.#resolve(e.target);

    if (!hit) {
      this.clearSelection();
      return;
    }

    const multi = this.#opts.enableMultiSelect && ((e.nativeEvent as PointerEvent).shiftKey || (e.nativeEvent as PointerEvent).metaKey);

    if (multi) {
      const idx = this.#selected.indexOf(hit);
      const added: Graphics[] = [];
      const removed: Graphics[] = [];
      if (idx >= 0) {
        this.#selected.splice(idx, 1);
        removed.push(hit);
      } else {
        this.#selected.push(hit);
        added.push(hit);
      }
      this.#syncState();
      this.#updateOverlay();
      this.#emitSelectionChange(added, removed);
    } else {
      if (this.#selected.length === 1 && this.#selected[0] === hit) return;
      const removed = this.#selected.filter(t => t !== hit);
      this.#selected = [hit];
      this.#syncState();
      this.#updateOverlay();
      this.#emitSelectionChange([hit], removed);
    }
  };

  #onPointerMove = (e: SimulatedEvent) => {
    // 其他插件交互进行中 → 跳过
    if (this.#isOtherPluginBusy()) return;

    // ── 框选拖拽中 ──
    if (this.#isDragging && this.#dragStartOffset) {
      this.#lastDragOffset = [e.offsetX, e.offsetY];
      this.#updateMarquee(e.offsetX, e.offsetY);
      return;
    }

    // 已 pointerdown 但未达拖拽阈值 → 检测是否开始拖拽
    if (this.#dragStartOffset) {
      const dx = e.offsetX - this.#dragStartOffset[0];
      const dy = e.offsetY - this.#dragStartOffset[1];
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        this.#isDragging = true;
        this.#lastDragOffset = [e.offsetX, e.offsetY];
        this.#marqueeNode!.setDisplay(true);
        this.#app!.setCursor('crosshair');
        this.#updateMarquee(e.offsetX, e.offsetY);
      }
      return;
    }

    // ── 悬停高亮 ──
    if (!this.#opts.enableHover) return;

    const hit = this.#resolve(e.target);
    if (hit === this.#hovering) return;

    const previous = this.#hovering;
    this.#hovering = hit;

    // 光标样式：悬停到可选节点时显示 pointer
    if (hit) {
      this.#app!.setCursor('pointer');
    } else {
      this.#app!.resetCursor();
    }

    this.#app!.setState('selection:hovering', hit);
    this.#updateHoverOverlay();
    this.#app!.bus.emit('selection:hover-change', {
      current: hit,
      previous,
    } satisfies HoverChangeEvent);
  };

  #onPointerDown = (e: SimulatedEvent) => {
    // 其他插件交互进行中 → 跳过框选
    if (this.#isOtherPluginBusy()) return;

    // 仅空白区域开始框选
    const hit = this.#resolve(e.target);
    if (hit) return;

    this.#dragStartOffset = [e.offsetX, e.offsetY];
    this.#isDragging = false;
  };

  #onPointerUp = () => {
    if (!this.#dragStartOffset) return;

    if (this.#isDragging) {
      this.#finishMarquee();
      // 标记跳过下一次 click，防止框选结果被清空
      this.#skipNextClick = true;
      this.#app!.resetCursor();
    }

    this.#isDragging = false;
    this.#dragStartOffset = null;
    this.#lastDragOffset = null;
    this.#marqueeNode!.setDisplay(false);
    this.#marqueeNode!.setDirty(true);
    this.#app!.requestRender();
  };

  // ════════════════════════════════════════════════════════════
  //  Internal — 框选（marquee）
  // ════════════════════════════════════════════════════════════

  #updateMarquee(currentX: number, currentY: number) {
    const [sx, sy] = this.#dragStartOffset!;

    // 画布像素坐标直接使用（和 worldBBox 同一坐标系）
    const lx = Math.min(sx, currentX);
    const ly = Math.min(sy, currentY);
    const lw = Math.abs(currentX - sx);
    const lh = Math.abs(currentY - sy);

    const node = this.#marqueeNode!;
    node.shape.from(lx, ly, lw, lh);
    node.shape.needUpdate = true;
    node.setDirty(true);
    this.#app!.requestRender();
  }

  #finishMarquee() {
    const [sx, sy] = this.#dragStartOffset!;
    const [ex, ey] = this.#lastDragOffset!;

    const mx = Math.min(sx, ex);
    const my = Math.min(sy, ey);
    const mw = Math.abs(ex - sx);
    const mh = Math.abs(ey - sy);
    const marqueeBBox = BoundingBox.fromRect(mx, my, mw, mh);

    // ── 收集相交的节点 ──
    const defaultLayer = this.#app!.getLayer('default');
    if (!defaultLayer) return;

    const hits: Graphics[] = [];
    const seen = new Set<Graphics>();

    defaultLayer.traverse((child: Graphics) => {
      if (child.type !== 3) return;
      const worldBB = (child as Node).getWorldBBox();
      if (!worldBB || worldBB.empty) return;
      if (!marqueeBBox.intersects(worldBB)) return;

      const resolved = this.#resolveGraphics(child);
      if (!resolved || seen.has(resolved)) return;
      seen.add(resolved);
      hits.push(resolved);
    });

    const added = hits.filter(t => !this.#selected.includes(t));
    const removed = this.#selected.filter(t => !hits.includes(t));
    this.#selected = hits;
    this.#syncState();
    this.#updateOverlay();
    if (added.length || removed.length) {
      this.#emitSelectionChange(added, removed);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 覆盖层 overlay 更新
  // ════════════════════════════════════════════════════════════

  /**
   * 重建选中框和悬停框的 overlay 节点。
   *
   * 坐标策略：
   * - getWorldBBox() 返回的是 worldMatrix 变换后的 AABB（画布像素坐标）。
   * - overlay Node 也在同一棵 Scene 树中（selection Layer），和 default Layer 共享
   *   相同的 Scene.worldMatrix → Layer.worldMatrix 链。
   * - 因此直接使用 worldBBox 坐标作为 overlay rect 的 shape 坐标即可。
   *   在渲染阶段，两者经过相同的 worldMatrix × DPR 变换，自然对齐。
   */
  #updateOverlay() {
    this.#updateSelectionOverlay();
    this.#updateHoverOverlay();
    this.#app!.requestRender();
  }

  #updateSelectionOverlay() {
    const selStyle = this.#opts.selectionStyle;

    this.#boxGroup!.removeChildren();
    for (const target of this.#selected) {
      // 自定义 overlay → 优先使用
      const custom = this.#opts.renderOverlay?.(target, 'selection');
      if (custom) {
        this.#boxGroup!.add(custom);
        continue;
      }

      // 默认矩形 overlay
      const bbox = getWorldBBox(target);
      if (!bbox || bbox.empty) continue;

      const p = selStyle.padding;
      const rect = this.#createOverlayRect(selStyle);
      rect.shape.from(bbox.x - p, bbox.y - p, bbox.width + p * 2, bbox.height + p * 2);
      this.#boxGroup!.add(rect);
    }
  }

  #updateHoverOverlay() {
    const hovStyle = this.#opts.hoverStyle;

    this.#hoverGroup!.removeChildren();
    if (this.#hovering && !this.#selected.includes(this.#hovering)) {
      // 自定义 overlay → 优先使用
      const custom = this.#opts.renderOverlay?.(this.#hovering, 'hover');
      if (custom) {
        this.#hoverGroup!.add(custom);
      } else {
        const bbox = getWorldBBox(this.#hovering);
        if (bbox && !bbox.empty) {
          const p = hovStyle.padding;
          const rect = this.#createOverlayRect(hovStyle);
          rect.shape.from(bbox.x - p, bbox.y - p, bbox.width + p * 2, bbox.height + p * 2);
          this.#hoverGroup!.add(rect);
        }
      }
    }

    this.#app!.requestRender();
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 工具方法
  // ════════════════════════════════════════════════════════════

  /**
   * 检测其他交互插件是否正忙（连线中 / 拖拽中）。
   *
   * 跨插件互斥策略：通过 app 全局 state 软感知，无硬依赖。
   * 当对应插件未安装时 getState 会抛出异常，catch 后返回 false。
   *
   * 已感知的 state key:
   * - `connect:connecting` — connect-plugin 正在连线
   * - `drag:dragging`      — drag-plugin 正在拖拽
   *
   * @see AGENTS.md "跨插件互斥" 章节
   */
  #isOtherPluginBusy(): boolean {
    if (!this.#app) return false;
    return this.#readState<boolean>('connect:connecting') || this.#readState<boolean>('drag:dragging');
  }

  /**
   * 安全读取 state，未注册时返回 false。
   */
  #readState<T>(key: string): boolean {
    try {
      return this.#app!.getState<T>(key) === true;
    } catch {
      return false;
    }
  }

  /** 通过 hitDelegate + filter 解析真正的选中目标 */
  #resolve(target: Graphics): Graphics | null {
    if (target === this.#app!.scene) return null;
    return this.#resolveGraphics(target);
  }

  #resolveGraphics(target: Graphics): Graphics | null {
    const resolved = this.#opts.hitDelegate ? this.#opts.hitDelegate(target) : target;
    if (!resolved) return null;
    if (this.#opts.filter && !this.#opts.filter(resolved)) return null;
    return resolved;
  }

  #applyFilter(targets: Graphics[]): Graphics[] {
    if (!this.#opts.filter) return targets;
    return targets.filter(t => this.#opts.filter!(t));
  }

  #syncState() {
    this.#app!.setState('selection:selected', [...this.#selected]);
  }

  #emitSelectionChange(added: Graphics[], removed: Graphics[]) {
    this.#app!.bus.emit('selection:change', {
      selected: [...this.#selected],
      added,
      removed,
    } satisfies SelectionChangeEvent);
  }

  #createGroup(name: string): Group {
    const g = new Group();
    g.setName(name);
    return g;
  }

  /** 创建带虚线样式的覆盖矩形节点 */
  #createOverlayRect(style: {fill?: string; stroke?: string; strokeWidth?: number; strokeDasharray?: string}): Node {
    return Node.create('rect', {
      fill: style.fill ?? 'transparent',
      stroke: style.stroke ?? '#1890ff',
      strokeWidth: style.strokeWidth ?? 1,
      strokeDasharray: style.strokeDasharray ?? '',
    });
  }
}

// ── 工厂函数 ──────────────────────────────────────────────

export function selectionPlugin(options?: SelectionPluginOptions): SelectionPlugin {
  return new SelectionPlugin(options);
}
