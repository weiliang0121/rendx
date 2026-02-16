import {uid8} from 'rendx-core';
import {Node as EngineNode} from 'rendx-engine';

import type {App, Plugin, Graphics, SimulatedEvent, Layer} from 'rendx-engine';
import type {Point} from 'rendx-core';
import type {ConnectPluginOptions, ConnectStartEvent, ConnectMoveEvent, ConnectCompleteEvent, ConnectCancelEvent, ConnectionRecord} from './types';

// ── 默认值 ───────────────────────────────────────────────

const DEFAULT_SNAP_RADIUS = 20;
const DEFAULT_CURSOR = 'crosshair';
const DEFAULT_PREVIEW_STROKE = '#1890ff';
const DEFAULT_PREVIEW_STROKE_WIDTH = 2;
const DEFAULT_PREVIEW_DASH = [6, 4];
const DEFAULT_LINE_STROKE = '#999';
const DEFAULT_LINE_STROKE_WIDTH = 2;

// ── 状态枚举 ─────────────────────────────────────────────

const enum ConnectState {
  Idle,
  Connecting,
}

// ── 内部完整配置 ─────────────────────────────────────────

interface ResolvedOptions {
  canConnect: ((source: Graphics, target: Graphics) => boolean) | null;
  allowSelfLoop: boolean;
  anchor: ((target: Graphics) => Point) | null;
  edgeType: string | null;
  edgeFactory: ((source: Graphics, target: Graphics) => Record<string, unknown>) | null;
  lineStroke: string;
  lineStrokeWidth: number;
  previewStroke: string;
  previewStrokeWidth: number;
  previewDash: number[];
  previewPath: ((source: Point, target: Point) => string) | null;
  snapRadius: number;
  cursor: string;
}

// ════════════════════════════════════════════════════════════
//  ConnectPlugin
// ════════════════════════════════════════════════════════════

export class ConnectPlugin implements Plugin {
  readonly name = 'connect';

  readonly state = [
    {key: 'connect:connecting', description: '是否正在连接', initial: false},
    {key: 'connect:source', description: '连接起点 Graphics', initial: null as Graphics | null},
  ];

  readonly layers = [{name: 'selection', zIndex: 10}];

  // ── 私有字段 ──

  #app: App | null = null;
  #opts: ResolvedOptions;

  /** 状态机 */
  #state: ConnectState = ConnectState.Idle;

  /** 连接起点 */
  #source: Graphics | null = null;

  /** 起点世界坐标 */
  #sourceAnchor: Point = [0, 0];

  /** 当前吸附的目标 */
  #snapTarget: Graphics | null = null;

  /** 当前 hover 的可连接端口（用于 idle cursor 反馈） */
  #hoveringPort: Graphics | null = null;

  /** 预览线 Node */
  #previewLine: EngineNode | null = null;

  /** overlay 层（与 selection-plugin 共享的交互层） */
  #overlayLayer: Layer | null = null;

  /** 纯引擎模式下维护的连接列表 */
  #connections: Map<string, ConnectionRecord> = new Map();

  /** 清理回调 */
  #cleanups: (() => void)[] = [];

  // ──────────────────────────────────────────────────────────

  constructor(options: ConnectPluginOptions = {}) {
    this.#opts = {
      canConnect: options.canConnect ?? null,
      allowSelfLoop: options.allowSelfLoop ?? false,
      anchor: options.anchor ?? null,
      edgeType: options.edgeType ?? null,
      edgeFactory: options.edgeFactory ?? null,
      lineStroke: options.lineStyle?.stroke ?? DEFAULT_LINE_STROKE,
      lineStrokeWidth: options.lineStyle?.strokeWidth ?? DEFAULT_LINE_STROKE_WIDTH,
      previewStroke: options.previewStroke ?? DEFAULT_PREVIEW_STROKE,
      previewStrokeWidth: options.previewStrokeWidth ?? DEFAULT_PREVIEW_STROKE_WIDTH,
      previewDash: options.previewDash ?? DEFAULT_PREVIEW_DASH,
      previewPath: options.previewPath ?? null,
      snapRadius: options.snapRadius ?? DEFAULT_SNAP_RADIUS,
      cursor: options.cursor ?? DEFAULT_CURSOR,
    };
  }

  // ════════════════════════════════════════════════════════════
  //  Plugin lifecycle
  // ════════════════════════════════════════════════════════════

  install(app: App) {
    this.#app = app;

    // 注册到交互管理器（最高优先级，连线操作不可被抢占）
    app.interaction.register('connect', {
      channels: ['pointer-exclusive'],
      priority: 15,
    });

    // 获取交互层（与 selection-plugin 共享 'selection' 层）
    this.#overlayLayer = app.getLayer('selection')!;
    this.#overlayLayer.setPointerEvents(false);
    this.#overlayLayer.culling = false;

    // 创建预览线（默认隐藏，永久驻留在 overlay 层中）
    this.#createPreviewLine();

    this.#bindEvents();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resize(_w: number, _h: number) {
    // 无需处理
  }

  serialize(): Record<string, unknown> {
    // 纯引擎模式下序列化连接记录
    const connections: {id: string; sourceUid: string; targetUid: string}[] = [];
    for (const conn of this.#connections.values()) {
      connections.push({
        id: conn.id,
        sourceUid: conn.source.uid,
        targetUid: conn.target.uid,
      });
    }
    return {connections};
  }

  dispose() {
    if (this.#state === ConnectState.Connecting) {
      this.#cancelConnect();
    }

    // 清理纯引擎模式的连接线
    for (const conn of this.#connections.values()) {
      if (conn.line.parent) {
        conn.line.parent.remove(conn.line);
      }
    }
    this.#connections.clear();

    // 清理预览线（从 overlay 层移除）
    if (this.#previewLine) {
      this.#overlayLayer?.remove(this.#previewLine);
    }
    this.#previewLine = null;

    for (const fn of this.#cleanups) fn();
    this.#cleanups = [];

    this.#app?.interaction.unregister('connect');
    this.#app?.resetCursor();
    this.#reset();
    this.#app = null;
  }

  // ════════════════════════════════════════════════════════════
  //  Public API
  // ════════════════════════════════════════════════════════════

  /** 当前是否正在连接 */
  isConnecting(): boolean {
    return this.#state === ConnectState.Connecting;
  }

  /** 获取当前连接起点 */
  getSource(): Graphics | null {
    return this.#source;
  }

  /** 编程式取消当前连接 */
  cancel(): void {
    if (this.#state === ConnectState.Connecting) {
      this.#cancelConnect();
    }
  }

  /** 获取纯引擎模式下的所有连接记录（只读） */
  getConnections(): readonly ConnectionRecord[] {
    return [...this.#connections.values()];
  }

  /** 移除纯引擎模式下的连接 */
  removeConnection(id: string): boolean {
    const conn = this.#connections.get(id);
    if (!conn) return false;

    if (conn.line.parent) {
      conn.line.parent.remove(conn.line);
    }
    this.#connections.delete(id);
    this.#app?.requestRender();
    return true;
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 预览线
  // ════════════════════════════════════════════════════════════

  #createPreviewLine() {
    this.#previewLine = EngineNode.create('path', {
      stroke: this.#opts.previewStroke,
      strokeWidth: this.#opts.previewStrokeWidth,
      strokeDasharray: this.#opts.previewDash,
      fill: 'none',
    });
    // 默认隐藏，永久挂载到 overlay 层
    this.#previewLine.setDisplay(false);
    this.#previewLine.setName('connect-preview-line');
    this.#overlayLayer!.add(this.#previewLine);
  }

  #showPreview(x1: number, y1: number, x2: number, y2: number) {
    if (!this.#previewLine) return;

    const source: Point = [x1, y1];
    const target: Point = [x2, y2];
    const pathData = this.#opts.previewPath ? this.#opts.previewPath(source, target) : `M${x1} ${y1}L${x2} ${y2}`;

    this.#previewLine.shape.from(pathData);
    this.#previewLine.setDisplay(true);
  }

  #hidePreview() {
    if (!this.#previewLine) return;
    this.#previewLine.setDisplay(false);
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

    window.addEventListener('pointerup', this.#onPointerUp);
    this.#cleanups.push(() => window.removeEventListener('pointerup', this.#onPointerUp));

    window.addEventListener('keydown', this.#onKeyDown);
    this.#cleanups.push(() => window.removeEventListener('keydown', this.#onKeyDown));
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 事件回调
  // ════════════════════════════════════════════════════════════

  #onPointerDown = (e: SimulatedEvent) => {
    if (this.#state !== ConnectState.Idle) return;

    // 通道锁检查：pointer-exclusive 被其他插件占用时跳过
    if (this.#app!.interaction.isLockedByOther('pointer-exclusive', 'connect')) return;

    // 解析连接起点
    const source = this.#resolveConnectable(e.target);
    if (!source) return;

    // 获取 pointer-exclusive 通道锁
    if (!this.#app!.interaction.acquire('pointer-exclusive', 'connect')) {
      return;
    }

    // 开始连接
    this.#source = source;
    this.#sourceAnchor = this.#getAnchor(source);
    this.#state = ConnectState.Connecting;
    this.#hoveringPort = null; // 清除 idle hover 状态

    this.#app!.setCursor(this.#opts.cursor);
    this.#app!.setState('connect:connecting', true);
    this.#app!.setState('connect:source', source);

    // 显示预览线（起点 = 终点，后续 pointermove 更新）
    // offsetX/offsetY = 画布像素坐标，与 #getAnchor()、selection 层坐标系一致
    this.#showPreview(this.#sourceAnchor[0], this.#sourceAnchor[1], e.offsetX, e.offsetY);
    this.#app!.requestRender();

    this.#app!.bus.emit('connect:start', {
      source,
      origin: [e.worldX, e.worldY],
    } satisfies ConnectStartEvent);
  };

  #onPointerMove = (e: SimulatedEvent) => {
    if (this.#state !== ConnectState.Connecting) {
      // ── Idle 状态：hover 到可连接端口时显示 crosshair ──
      const connectable = this.#resolveConnectable(e.target);
      if (connectable) {
        if (!this.#hoveringPort) {
          this.#hoveringPort = connectable;
          this.#app!.setCursor(this.#opts.cursor);
        }
      } else if (this.#hoveringPort) {
        this.#hoveringPort = null;
        this.#app!.resetCursor();
      }
      return;
    }

    // offsetX/offsetY = 画布像素坐标，与 #getAnchor()、selection 层坐标系一致
    const px = e.offsetX;
    const py = e.offsetY;

    // 扫描吸附目标
    const prevSnap = this.#snapTarget;
    this.#snapTarget = this.#findSnapTarget(px, py);

    // 吸附目标变化 → 更新光标
    if (this.#snapTarget !== prevSnap) {
      this.#app!.setCursor(this.#snapTarget ? 'cell' : this.#opts.cursor);
    }

    // 更新预览线终点
    let endX = px;
    let endY = py;
    if (this.#snapTarget) {
      const anchor = this.#getAnchor(this.#snapTarget);
      endX = anchor[0];
      endY = anchor[1];
    }

    this.#showPreview(this.#sourceAnchor[0], this.#sourceAnchor[1], endX, endY);
    this.#app!.requestRender();

    this.#app!.bus.emit('connect:move', {
      source: this.#source!,
      cursor: [e.worldX, e.worldY],
      snapTarget: this.#snapTarget,
    } satisfies ConnectMoveEvent);
  };

  #onPointerUp = () => {
    if (this.#state !== ConnectState.Connecting) return;

    if (this.#snapTarget) {
      this.#completeConnect(this.#snapTarget);
    } else {
      this.#cancelConnect();
    }
  };

  #onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.#state === ConnectState.Connecting) {
      this.#cancelConnect();
    }
  };

  // ════════════════════════════════════════════════════════════
  //  Internal — 连接操作
  // ════════════════════════════════════════════════════════════

  /**
   * 完成连接：委托 graph 或自行创建 line
   */
  #completeConnect(target: Graphics) {
    const source = this.#source!;

    // ── 重复边检查 ──
    // 如果 graph-plugin 中已存在连接相同 source → target 的边，跳过创建
    if (this.#hasDuplicateEdge(source, target)) {
      this.#hidePreview();
      this.#cleanupState();
      return;
    }

    this.#hidePreview();

    // 创建边
    this.#createEdge(source, target);

    this.#app!.bus.emit('connect:complete', {
      source,
      target,
    } satisfies ConnectCompleteEvent);

    this.#cleanupState();
  }

  /**
   * 取消连接
   */
  #cancelConnect() {
    this.#hidePreview();

    this.#app!.bus.emit('connect:cancel', {
      source: this.#source!,
    } satisfies ConnectCancelEvent);

    this.#cleanupState();
  }

  /**
   * 连接结束后的状态清理
   */
  #cleanupState() {
    this.#app!.interaction.release('pointer-exclusive', 'connect');
    this.#app!.resetCursor();
    this.#app!.setState('connect:connecting', false);
    this.#app!.setState('connect:source', null);
    this.#app!.requestRender();
    this.#reset();
  }

  /**
   * 复位内部状态
   */
  #reset() {
    this.#state = ConnectState.Idle;
    this.#source = null;
    this.#sourceAnchor = [0, 0];
    this.#snapTarget = null;
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 边的创建（两种路径）
  // ════════════════════════════════════════════════════════════

  /**
   * 创建边。优先走 graph-plugin，否则自行创建 line。
   */
  #createEdge(source: Graphics, target: Graphics) {
    const graph = this.#getGraph();

    if (graph && this.#opts.edgeType) {
      // ── Graph 模式 ──
      const edgeData = this.#buildEdgeData(source, target);
      graph.add(this.#opts.edgeType, edgeData);
      this.#app!.requestRender();
      return;
    }

    // ── 纯引擎模式 ── 自行创建 line Node
    this.#createEngineLine(source, target);
  }

  /**
   * Graph 模式：构建 edge data
   */
  #buildEdgeData(source: Graphics, target: Graphics): Record<string, unknown> {
    // 用户自定义工厂优先
    if (this.#opts.edgeFactory) {
      return this.#opts.edgeFactory(source, target);
    }

    // 默认工厂：自动溯源 element ID
    const sourceId = this.#resolveElementId(source);
    const targetId = this.#resolveElementId(target);

    const data: Record<string, unknown> = {
      id: `edge-${uid8()}`,
      source: sourceId ?? source.uid,
      target: targetId ?? target.uid,
    };

    // 如果端口 Graphics 上有 data，自动带上为 sourcePort / targetPort
    if (source.data && Object.keys(source.data).length > 0) {
      data.sourcePort = {...source.data};
    }
    if (target.data && Object.keys(target.data).length > 0) {
      data.targetPort = {...target.data};
    }

    return data;
  }

  /**
   * 纯引擎模式：创建 line Node 并添加到场景
   */
  #createEngineLine(source: Graphics, target: Graphics) {
    const [sx, sy] = this.#getAnchor(source);
    const [tx, ty] = this.#getAnchor(target);

    const line = EngineNode.create('line', {
      stroke: this.#opts.lineStroke,
      strokeWidth: this.#opts.lineStrokeWidth,
    });
    line.shape.from(sx, sy, tx, ty);

    // 添加到主场景（不在 overlay 层）
    this.#app!.scene.add(line);

    const id = `conn-${uid8()}`;
    this.#connections.set(id, {id, line, source, target});

    this.#app!.requestRender();
    this.#app!.bus.emit('connect:edge-created', {id, source, target});
  }

  /**
   * 同步纯引擎模式下的连接线位置。
   * 在 render 前调用，更新所有 line 端点为最新的 anchor 坐标。
   */
  syncConnections() {
    if (this.#connections.size === 0) return;

    let dirty = false;
    for (const conn of this.#connections.values()) {
      const [sx, sy] = this.#getAnchor(conn.source);
      const [tx, ty] = this.#getAnchor(conn.target);
      conn.line.shape.from(sx, sy, tx, ty);
      conn.line.setDirty(true);
      dirty = true;
    }

    if (dirty) {
      this.#app?.requestRender();
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 目标解析
  // ════════════════════════════════════════════════════════════

  /**
   * 检查 Graphics 是否是可连接端口。
   *
   * 解析策略：
   * 1. 沿 parent chain 走到 element group（graph.has(name)）。
   * 2. 查询 connectable trait：
   *    - false → 不可连线
   *    - PortResolver 函数 → 调用取端口列表，匹配 target
   *    - true → element group 本身作为连接目标
   */
  #resolveConnectable(target: Graphics): Graphics | null {
    if (target === this.#app!.scene) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = this.#getGraph() as any;
    if (!graph) return null;

    // 沿 parent chain 走到 element group
    let elementGroup: Graphics | null = null;
    let current: Graphics | null = target;
    while (current) {
      if (current.name && graph.has(current.name)) {
        elementGroup = current;
        break;
      }
      current = current.parent;
    }

    if (!elementGroup) return null;

    const traits = this.#app!.interaction.queryTraits(elementGroup);
    const connectable = traits.connectable;

    // connectable === false → 不可连线
    if (connectable === false) return null;

    if (typeof connectable === 'function') {
      // PortResolver：调用函数获取端口列表，匹配 target
      const ports = (connectable as (g: Graphics) => Graphics[])(elementGroup);
      return this.#matchPort(target, elementGroup, ports);
    }

    // connectable === true → element group 本身作为连接目标
    return elementGroup;
  }

  /**
   * 在 ports 列表中查找与 target 匹配的端口。
   * target 本身或其祖先（不超过 elementGroup）若在 ports 中则返回。
   */
  #matchPort(target: Graphics, elementGroup: Graphics, ports: Graphics[]): Graphics | null {
    let current: Graphics | null = target;
    while (current && current !== elementGroup.parent) {
      if (ports.includes(current)) return current;
      current = current.parent;
    }
    return null;
  }

  /**
   * 在 snapRadius 内寻找最近的可连接目标
   */
  #findSnapTarget(px: number, py: number): Graphics | null {
    const candidates = this.#collectConnectables();
    const radius = this.#opts.snapRadius;
    const radiusSq = radius * radius;

    let best: Graphics | null = null;
    let bestDistSq = Infinity;

    for (const candidate of candidates) {
      // 跳过起点自身（除非允许自环）
      if (!this.#opts.allowSelfLoop && this.#isSameElement(candidate, this.#source!)) {
        continue;
      }

      // 自定义验证
      if (this.#opts.canConnect && !this.#opts.canConnect(this.#source!, candidate)) {
        continue;
      }

      // px/py 和 anchor 都是画布像素坐标，可直接做距离比较
      const [ax, ay] = this.#getAnchor(candidate);
      const dx = px - ax;
      const dy = py - ay;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq < bestDistSq) {
        bestDistSq = distSq;
        best = candidate;
      }
    }

    return best;
  }

  /**
   * 收集场景中所有可连接的端口 Graphics。
   *
   * 遍历所有 graph 元素，根据 connectable trait 收集端口：
   * - false → 跳过
   * - PortResolver → 调用函数获取端口
   * - true → element group 本身
   */
  #collectConnectables(): Graphics[] {
    const result: Graphics[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = this.#getGraph() as any;

    if (!graph || typeof graph.getAll !== 'function') return result;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements = graph.getAll() as any[];

    for (const el of elements) {
      const connectable = el.traits?.connectable;

      if (connectable === false || connectable === undefined) continue;

      if (typeof connectable === 'function') {
        // PortResolver
        const ports = (connectable as (g: Graphics) => Graphics[])(el.group);
        for (const port of ports) {
          if (port.display) result.push(port);
        }
      } else if (connectable === true) {
        // element group 本身作为连接目标
        if (el.group.display) result.push(el.group);
      }
    }

    return result;
  }

  /**
   * 判断两个端口是否属于同一个元素。
   * 有 graph-plugin 时按 element ID 比较；否则按 Graphics 引用比较。
   */
  #isSameElement(a: Graphics, b: Graphics): boolean {
    const graph = this.#getGraph();
    if (graph) {
      const idA = this.#resolveElementId(a);
      const idB = this.#resolveElementId(b);
      if (idA && idB) return idA === idB;
    }
    return a.uid === b.uid;
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 坐标与溯源
  // ════════════════════════════════════════════════════════════

  /**
   * 获取 Graphics 的连接锚点（世界坐标）。
   */
  #getAnchor(target: Graphics): Point {
    // 用户自定义 anchor
    if (this.#opts.anchor) {
      return this.#opts.anchor(target);
    }

    return this.#defaultAnchor(target);
  }

  /**
   * 默认锚点计算：
   * - Node（type=3）: 取 getWorldBBox() 中心
   * - Group: 遍历子节点合并 worldBBox 取中心
   * - fallback: 取 worldMatrix 的 translation 部分
   */
  #defaultAnchor(target: Graphics): Point {
    // type=3 是 Node，有 getWorldBBox
    if (target.type === 3) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bbox = (target as any).getWorldBBox();
      if (bbox && !bbox.empty) {
        return [bbox.cx, bbox.cy];
      }
    }

    // Group: 遍历子节点，合并 worldBBox 取中心
    if (target.children.length) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      let found = false;
      for (const child of target.children) {
        if (child.type !== 3) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bbox = (child as any).getWorldBBox();
        if (bbox && !bbox.empty) {
          if (bbox.x < minX) minX = bbox.x;
          if (bbox.y < minY) minY = bbox.y;
          if (bbox.right > maxX) maxX = bbox.right;
          if (bbox.bottom > maxY) maxY = bbox.bottom;
          found = true;
        }
      }
      if (found) {
        return [(minX + maxX) / 2, (minY + maxY) / 2];
      }
    }

    // fallback: worldMatrix 的 translation 部分 (e[4], e[5])
    const m = target.worldMatrix;
    return [m[4], m[5]];
  }

  /**
   * 从端口 Graphics 沿 parent chain 向上走，
   * 找到 graph-plugin 认识的 element group（group.name === element.id）。
   */
  #resolveElementId(graphics: Graphics): string | null {
    const graph = this.#getGraph();
    if (!graph) return null;

    let current: Graphics | null = graphics;
    while (current) {
      if (current.name && graph.has(current.name)) {
        return current.name;
      }
      current = current.parent;
    }
    return null;
  }

  /**
   * 检查 graph-plugin 中是否已存在相同 source→target 的边（防止重复连线）。
   *
   * 当 source/target 是端口级 Graphics（PortResolver 模式）时，
   * 仅节点 ID 相同不算重复，还需端口 uid 也相同才是真正重复。
   */
  #hasDuplicateEdge(source: Graphics, target: Graphics): boolean {
    const graph = this.#getGraph();
    if (!graph || typeof graph.getEdges !== 'function') return false;

    const sourceId = this.#resolveElementId(source);
    const targetId = this.#resolveElementId(target);
    if (!sourceId || !targetId) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edges = graph.getEdges() as any[];

    return edges.some((e: {data: Record<string, unknown>}) => {
      if (e.data.source !== sourceId || e.data.target !== targetId) return false;

      // 节点 ID 匹配后，检查端口级别是否也匹配
      // sourcePort/targetPort 存在时说明是端口模式，需要进一步比较
      const srcPortData = source.data;
      const tgtPortData = target.data;
      const edgeSrcPort = e.data.sourcePort as Record<string, unknown> | undefined;
      const edgeTgtPort = e.data.targetPort as Record<string, unknown> | undefined;

      // 两端都没有端口信息 → connectable: true 模式，节点 ID 匹配即为重复
      if (!srcPortData && !edgeSrcPort && !tgtPortData && !edgeTgtPort) return true;

      // 比较端口：通过 JSON 序列化比较端口 data
      const srcMatch = JSON.stringify(srcPortData ?? null) === JSON.stringify(edgeSrcPort ?? null);
      const tgtMatch = JSON.stringify(tgtPortData ?? null) === JSON.stringify(edgeTgtPort ?? null);
      return srcMatch && tgtMatch;
    });
  }

  // ════════════════════════════════════════════════════════════
  //  Internal — 插件感知
  // ════════════════════════════════════════════════════════════

  /**
   * 获取 graph-plugin 实例（软感知，无则返回 null）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #getGraph(): any | null {
    if (!this.#app) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = this.#app.getPlugin('graph') as any;
    if (!graph || typeof graph.add !== 'function' || typeof graph.has !== 'function') return null;
    return graph;
  }
}

// ── 工厂函数 ──────────────────────────────────────────────

export function connectPlugin(options?: ConnectPluginOptions): ConnectPlugin {
  return new ConnectPlugin(options);
}
