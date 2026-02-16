import type {Group, Graphics} from 'rendx-engine';

// ═══════════════════════════════════════════════
// Base data — 所有元素的公共字段
// ═══════════════════════════════════════════════

/** Node 基础字段 */
export interface NodeBase {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/** Edge 基础字段 */
export interface EdgeBase {
  id: string;
  source: string;
  target: string;
}

// ═══════════════════════════════════════════════
// Render context — render fn 的第一参数
// ═══════════════════════════════════════════════

/** Node render fn 接收的上下文 */
export interface NodeContext {
  group: Group;
  width: number;
  height: number;
  onCleanup: (fn: () => void) => void;
}

/** Edge render fn 接收的上下文 */
export interface EdgeContext {
  group: Group;
  source: Element<NodeBase> | undefined;
  target: Element<NodeBase> | undefined;
  onCleanup: (fn: () => void) => void;
}

// ═══════════════════════════════════════════════
// Render function signatures
// ═══════════════════════════════════════════════

export type NodeRenderFn<T extends NodeBase = NodeBase> = (ctx: NodeContext, data: T & NodeBase, graph: GraphQuery) => void;

export type EdgeRenderFn<T extends EdgeBase = EdgeBase> = (ctx: EdgeContext, data: T & EdgeBase, graph: GraphQuery) => void;

// ═══════════════════════════════════════════════
// Element traits — 元素特征声明
// ═══════════════════════════════════════════════

/**
 * 端口解析器 — 从元素 Group 中返回可连接的端口 Graphics。
 *
 * 替代 className('connectable') 标记，在元素定义时声明端口解析逻辑，
 * 不可变、类型安全、与 CSS className 解耦。
 *
 * @example
 * ```ts
 * connectable: (group) => group.children.filter(c => c.data?.role === 'port')
 * ```
 */
export type PortResolver = (group: Group) => Graphics[];

/**
 * 元素特征声明。
 * 在 createNode / createEdge 时声明，供其他插件（drag、selection 等）
 * 通过 `app.interaction.queryTraits(target)` 查询。
 *
 * 已知特征：
 * - `draggable`        — 是否可拖拽（默认 node=true, edge=false）
 * - `selectable`       — 是否可选中（默认 true）
 * - `connectable`      — 是否可连线 / 端口解析器（默认 node=true, edge=false）
 *     - `false`        — 不可连线
 *     - `true`         — 可连线，element group 本身作为连接目标
 *     - `PortResolver` — 可连线，端口由函数返回（推荐）
 * - `deletable`        — 是否可删除（默认 true）
 * - `positionDerived`  — 位置是否由其他元素派生（默认 edge=true, node=false）
 */
export interface GraphElementTraits {
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean | PortResolver;
  deletable?: boolean;
  positionDerived?: boolean;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════
// Element definition — createNode / createEdge 的返回值
// ═══════════════════════════════════════════════

export interface NodeDef<T extends NodeBase = NodeBase> {
  __element_def__: true;
  role: 'node';
  render: NodeRenderFn<T>;
  /** 元素特征声明，供其他插件查询。缺省时使用 node 默认值（draggable: true） */
  traits?: GraphElementTraits;
}

export interface EdgeDef<T extends EdgeBase = EdgeBase> {
  __element_def__: true;
  role: 'edge';
  render: EdgeRenderFn<T>;
  /** 元素特征声明，供其他插件查询。缺省时使用 edge 默认值（draggable: false, positionDerived: true） */
  traits?: GraphElementTraits;
}

export type ElementDef = NodeDef | EdgeDef;

// ═══════════════════════════════════════════════
// Element 运行时实例
// ═══════════════════════════════════════════════

export interface Element<T = Record<string, unknown>> {
  readonly id: string;
  readonly role: 'node' | 'edge';
  readonly group: Group;
  readonly data: T & (NodeBase | EdgeBase);
  readonly mounted: boolean;
  readonly layer: string;
  readonly deps: string[];
  /** 元素特征（合并后的）— 来自定义时的 traits + 角色默认值 */
  readonly traits: Readonly<GraphElementTraits>;
  update(patch: Partial<T>): void;
  dispose(): void;
}

// ═══════════════════════════════════════════════
// Graph query — render fn 的第三参数
// ═══════════════════════════════════════════════

export interface GraphQuery {
  get<T = Record<string, unknown>>(id: string): Element<T> | undefined;
  has(id: string): boolean;
  count: number;
  getIds(): string[];
  getAll(): Element[];
  getNodes(): Element<NodeBase>[];
  getEdges(): Element<EdgeBase>[];
  getEdgesOf(nodeId: string): Element<EdgeBase>[];
}
