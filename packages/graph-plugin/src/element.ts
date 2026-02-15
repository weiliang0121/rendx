import {Group} from 'rendx-engine';

import type {Element, ElementDef, NodeBase, EdgeBase, NodeContext, EdgeContext, GraphQuery} from './types';

/**
 * ElementImpl — 元素运行时实例。
 *
 * - Node: translate(x, y)，仅位移变化时 skip rebuild
 * - Edge: 不 translate，render 时自动注入 source/target
 */
export class ElementImpl<T = Record<string, unknown>> implements Element<T> {
  readonly id: string;
  readonly role: 'node' | 'edge';
  readonly group: Group;
  readonly layer: string;
  readonly deps: string[];
  /** 创建时使用的类型名称（对应 register 的 name），用于序列化 */
  readonly typeName: string;

  #data: T & (NodeBase | EdgeBase);
  #def: ElementDef;
  #graph: GraphQuery;
  #cleanup: (() => void) | null = null;
  #mounted = false;
  #onUpdate: ((id: string) => void) | null;

  constructor(id: string, typeName: string, def: ElementDef, data: T & (NodeBase | EdgeBase), graph: GraphQuery, layer: string, deps: string[], onUpdate?: (id: string) => void) {
    this.id = id;
    this.typeName = typeName;
    this.role = def.role;
    this.#def = def;
    this.#data = {...data};
    this.#graph = graph;
    this.layer = layer;
    this.deps = deps;
    this.#onUpdate = onUpdate ?? null;

    this.group = new Group();
    this.group.setName(id);

    // Node: 设置初始位置
    if (def.role === 'node') {
      const nd = this.#data as NodeBase;
      this.group.translate(nd.x, nd.y);
    }

    this.#render();
    this.#mounted = true;
  }

  get data(): T & (NodeBase | EdgeBase) {
    return this.#data;
  }

  get mounted(): boolean {
    return this.#mounted;
  }

  /**
   * 部分更新数据。
   * - id 不可变
   * - Node: 仅 x/y 变化 → translate only（不重建子树）
   * - Edge: source/target 变化时忽略（deps 已静态绑定）
   */
  update(patch: Partial<T>): void {
    // id 不可变
    if ('id' in patch) {
      delete (patch as Record<string, unknown>).id;
    }

    const merged = {...this.#data, ...patch} as T & (NodeBase | EdgeBase);

    if (this.role === 'node') {
      const oldData = this.#data as NodeBase;
      const newData = merged as NodeBase;

      // 只有 x/y 变了 → position-only 优化
      const positionOnly = isPositionOnlyChange(oldData, newData, patch as Record<string, unknown>);

      this.#data = merged;

      if (positionOnly) {
        this.group.translate(newData.x, newData.y);
        this.#onUpdate?.(this.id);
        return;
      }

      // 位置也可能变了，需更新 translate
      if (newData.x !== oldData.x || newData.y !== oldData.y) {
        this.group.translate(newData.x, newData.y);
      }
    } else {
      this.#data = merged;
    }

    // 数据变化 → 重建子树
    this.#teardown();
    this.group.removeChildren();
    this.#render();
    this.#onUpdate?.(this.id);
  }

  dispose(): void {
    this.#teardown();
    this.group.removeChildren();
    this.#mounted = false;
  }

  // ── internal ──

  #render(): void {
    let cleanup: (() => void) | null = null;
    const onCleanup = (fn: () => void) => {
      cleanup = fn;
    };

    if (this.#def.role === 'node') {
      const nd = this.#data as T & NodeBase;
      const ctx: NodeContext = {
        group: this.group,
        width: nd.width ?? 0,
        height: nd.height ?? 0,
        onCleanup,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.#def.render as any)(ctx, nd, this.#graph);
    } else {
      const ed = this.#data as T & EdgeBase;
      const ctx: EdgeContext = {
        group: this.group,
        source: this.#graph.get<NodeBase>(ed.source),
        target: this.#graph.get<NodeBase>(ed.target),
        onCleanup,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.#def.render as any)(ctx, ed, this.#graph);
    }

    this.#cleanup = cleanup;
  }

  #teardown(): void {
    if (this.#cleanup) {
      this.#cleanup();
      this.#cleanup = null;
    }
  }
}

// ── helpers ──

function isPositionOnlyChange(oldData: NodeBase, newData: NodeBase, patch: Record<string, unknown>): boolean {
  const keys = Object.keys(patch);
  if (keys.length === 0) return false;

  for (const key of keys) {
    if (key === 'x' || key === 'y') continue;
    // 有非 x/y 的 key 且值变了
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((oldData as any)[key] !== (newData as any)[key]) {
      return false;
    }
  }

  // 至少 x 或 y 变了
  return oldData.x !== newData.x || oldData.y !== newData.y;
}
