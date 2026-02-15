import type {Group} from 'rendx-engine';

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
// Element definition — createNode / createEdge 的返回值
// ═══════════════════════════════════════════════

export interface NodeDef<T extends NodeBase = NodeBase> {
  __element_def__: true;
  role: 'node';
  render: NodeRenderFn<T>;
}

export interface EdgeDef<T extends EdgeBase = EdgeBase> {
  __element_def__: true;
  role: 'edge';
  render: EdgeRenderFn<T>;
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
