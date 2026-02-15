import {uid8} from 'rendx-core';
import {Node as EngineNode} from 'rendx-engine';

import type {App, Plugin, Graphics, SimulatedEvent, Layer} from 'rendx-engine';
import type {Point} from 'rendx-core';
import type {ConnectPluginOptions, ConnectStartEvent, ConnectMoveEvent, ConnectCompleteEvent, ConnectCancelEvent, ConnectionRecord} from './types';

// ── 默认值 ───────────────────────────────────────────────

const DEFAULT_CLASS_NAME = 'connectable';
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
  className: string;
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

  readonly layers = [{name: 'connect', zIndex: 900}];

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

  /** 预览线 Node */
  #previewLine: EngineNode | null = null;

  /** 预览线是否已添加到 overlay 层 */
  #previewAdded = false;

  /** overlay 层 */
  #connectLayer: Layer | null = null;

  /** 纯引擎模式下维护的连接列表 */
  #connections: Map<string, ConnectionRecord> = new Map();

  /** 清理回调 */
  #cleanups: (() => void)[] = [];

  // ──────────────────────────────────────────────────────────

  constructor(options: ConnectPluginOptions = {}) {
    this.#opts = {
      className: options.className ?? DEFAULT_CLASS_NAME,
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

    // 获取 overlay 层
    this.#connectLayer = app.getLayer('connect')!;
    this.#connectLayer.setPointerEvents(false);
    this.#connectLayer.culling = false;

    // 创建预览线（默认隐藏）
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

    // 清理预览线
    if (this.#previewAdded && this.#previewLine) {
      this.#connectLayer?.remove(this.#previewLine);
      this.#previewAdded = false;
    }
    this.#previewLine = null;

    for (const fn of this.#cleanups) fn();
    this.#cleanups = [];

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
    // 不预先 add 到 layer，showPreview 时按需 add
  }

  #showPreview(x1: number, y1: number, x2: number, y2: number) {
    if (!this.#previewLine) return;

    const source: Point = [x1, y1];
    const target: Point = [x2, y2];
    const pathData = this.#opts.previewPath ? this.#opts.previewPath(source, target) : `M${x1} ${y1}L${x2} ${y2}`;

    this.#previewLine.shape.from(pathData);
    this.#previewLine.setDisplay(true);

    // 确保已添加到 overlay 层
    if (!this.#previewAdded) {
      this.#connectLayer!.add(this.#previewLine);
      this.#previewAdded = true;
    }
    this.#previewLine.setDirty(true);
  }

  #hidePreview() {
    if (!this.#previewLine) return;
    // 从 overlay 层移除，强制层重绘清除画面
    if (this.#previewAdded) {
      this.#connectLayer!.remove(this.#previewLine);
      this.#previewAdded = false;
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

    // 检查是否有其他互斥插件正在工作
    if (this.#isDragActive()) return;

    // 解析连接起点
    const source = this.#resolveConnectable(e.target);
    if (!source) return;

    // 开始连接
    this.#source = source;
    this.#sourceAnchor = this.#getAnchor(source);
    this.#state = ConnectState.Connecting;

    this.#app!.setCursor(this.#opts.cursor);
    this.#app!.setState('connect:connecting', true);
    this.#app!.setState('connect:source', source);

    // 显示预览线（起点 = 终点，后续 pointermove 更新）
    this.#showPreview(this.#sourceAnchor[0], this.#sourceAnchor[1], e.worldX, e.worldY);
    this.#app!.requestRender();

    this.#app!.bus.emit('connect:start', {
      source,
      origin: [e.worldX, e.worldY],
    } satisfies ConnectStartEvent);
  };

  #onPointerMove = (e: SimulatedEvent) => {
    if (this.#state !== ConnectState.Connecting) return;

    const worldX = e.worldX;
    const worldY = e.worldY;

    // 扫描吸附目标
    this.#snapTarget = this.#findSnapTarget(worldX, worldY);

    // 更新预览线终点
    let endX = worldX;
    let endY = worldY;
    if (this.#snapTarget) {
      const anchor = this.#getAnchor(this.#snapTarget);
      endX = anchor[0];
      endY = anchor[1];
    }

    this.#showPreview(this.#sourceAnchor[0], this.#sourceAnchor[1], endX, endY);
    this.#app!.requestRender();

    this.#app!.bus.emit('connect:move', {
      source: this.#source!,
      cursor: [worldX, worldY],
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
   * 检查 Graphics 是否是可连接的。
   * 沿 parent chain 向上搜索，找到第一个带有 connectable className 的节点。
   */
  #resolveConnectable(target: Graphics): Graphics | null {
    if (target === this.#app!.scene) return null;

    let current: Graphics | null = target;
    while (current) {
      if (current.hasClassName(this.#opts.className)) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  /**
   * 在 snapRadius 内寻找最近的可连接目标
   */
  #findSnapTarget(worldX: number, worldY: number): Graphics | null {
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

      const [ax, ay] = this.#getAnchor(candidate);
      const dx = worldX - ax;
      const dy = worldY - ay;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq < bestDistSq) {
        bestDistSq = distSq;
        best = candidate;
      }
    }

    return best;
  }

  /**
   * 收集场景中所有可连接的 Graphics
   */
  #collectConnectables(): Graphics[] {
    const result: Graphics[] = [];
    const className = this.#opts.className;

    this.#app!.scene.traverse((g: Graphics) => {
      if (g.hasClassName(className) && g.display) {
        result.push(g);
      }
    });

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
   * - Group / 其他: 取 worldMatrix 的 translation 部分
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

  /**
   * 检查 drag-plugin 是否正在拖拽
   */
  #isDragActive(): boolean {
    if (!this.#app) return false;
    try {
      return this.#app.getState<boolean>('drag:dragging') === true;
    } catch {
      return false;
    }
  }
}

// ── 工厂函数 ──────────────────────────────────────────────

export function connectPlugin(options?: ConnectPluginOptions): ConnectPlugin {
  return new ConnectPlugin(options);
}
