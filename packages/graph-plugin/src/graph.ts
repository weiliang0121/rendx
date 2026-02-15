import {Group} from 'rendx-engine';

import {ElementImpl} from './element';

import type {App} from 'rendx-engine';
import type {Element, ElementDef, NodeBase, EdgeBase, GraphQuery} from './types';
import type {Plugin} from 'rendx-engine';

/**
 * GraphPlugin — 元素生命周期管理器。
 *
 * 核心职责:
 * 1. 注册元素类型定义 (register)
 * 2. 增删查改元素实例 (add / remove / get / update)
 * 3. 自动分层: Node → 'nodes' Group, Edge → 'edges' Group
 * 4. 自动依赖: Edge 的 deps 从 source/target 自动派生
 * 5. 依赖追踪: 被依赖元素更新时自动重绘依赖方
 * 6. Graph 查询: getNodes / getEdges / getEdgesOf
 */
export class GraphPlugin implements Plugin, GraphQuery {
  readonly name = 'graph';

  readonly state = [
    {
      key: 'graph:elements',
      description: 'All element IDs in the graph',
      initial: [] as string[],
    },
  ];

  #app!: App;
  #types = new Map<string, ElementDef>();
  #elements = new Map<string, ElementImpl>();

  /** node → 依赖它的元素 id 列表 */
  #dependents = new Map<string, Set<string>>();

  /** 批量操作标志 */
  #batching = false;
  #batchAdded = false;
  #batchRemoved = false;

  /** 场景分组 */
  #edgesGroup!: Group;
  #nodesGroup!: Group;

  get edgesGroup(): Group {
    return this.#edgesGroup;
  }
  get nodesGroup(): Group {
    return this.#nodesGroup;
  }

  // ── Plugin lifecycle ──

  install(app: App): void {
    this.#app = app;

    // edges 在下方，nodes 在上方（先添加 edges）
    this.#edgesGroup = new Group();
    this.#edgesGroup.setName('__graph_edges__');
    app.scene.add(this.#edgesGroup);

    this.#nodesGroup = new Group();
    this.#nodesGroup.setName('__graph_nodes__');
    app.scene.add(this.#nodesGroup);
  }

  dispose(): void {
    // 清理所有元素
    for (const el of this.#elements.values()) {
      el.dispose();
    }
    this.#elements.clear();
    this.#dependents.clear();
    this.#types.clear();
  }

  // ── 序列化 / 反序列化 ──

  /**
   * 序列化所有元素实例的数据（供 history-plugin 等消费）。
   * 类型定义（render fn）无法序列化，需要应用层在恢复时保证 register 已调用。
   */
  serialize(): Record<string, unknown> {
    const elements: {typeName: string; data: Record<string, unknown>; layer: string; deps: string[]}[] = [];
    for (const el of this.#elements.values()) {
      elements.push({
        typeName: el.typeName,
        data: {...el.data},
        layer: el.layer,
        deps: [...el.deps],
      });
    }
    return {elements};
  }

  /**
   * 从序列化数据恢复所有元素。
   *
   * 流程：
   * 1. 清理当前所有元素和依赖追踪
   * 2. 从恢复后的场景中移除 restoreFromJSON 反序列化出的静态 Group（它们缺少 ElementImpl 追踪）
   * 3. 重建 edges/nodes 分组
   * 4. 使用已注册的类型定义重新创建所有元素（会重新执行 render fn）
   */
  deserialize(data: Record<string, unknown>): void {
    const saved = data as {elements: {typeName: string; data: Record<string, unknown>; layer: string; deps: string[]}[]};
    if (!saved.elements || !Array.isArray(saved.elements)) return;

    // 1. 清理当前元素（cleanup 回调、内部状态）
    for (const el of this.#elements.values()) {
      el.dispose();
    }
    this.#elements.clear();
    this.#dependents.clear();

    // 2. 移除 restoreFromJSON 反序列化出的静态分组
    const scene = this.#app.scene;
    for (const layer of scene.layers) {
      if (layer.isEventLayer) continue;
      // 逆序遍历 children，找到并移除名为 __graph_edges__ / __graph_nodes__ 的 Group
      const toRemove: Group[] = [];
      for (const child of layer.children) {
        if (child.name === '__graph_edges__' || child.name === '__graph_nodes__') {
          toRemove.push(child as Group);
        }
      }
      for (const g of toRemove) {
        layer.remove(g);
      }
    }

    // 3. 重建分组
    this.#edgesGroup = new Group();
    this.#edgesGroup.setName('__graph_edges__');
    scene.add(this.#edgesGroup);

    this.#nodesGroup = new Group();
    this.#nodesGroup.setName('__graph_nodes__');
    scene.add(this.#nodesGroup);

    // 4. 批量重建元素（先 node 后 edge，保证 edge 的 source/target 已存在）
    const nodes = saved.elements.filter(e => {
      const def = this.#types.get(e.typeName);
      return def?.role === 'node';
    });
    const edges = saved.elements.filter(e => {
      const def = this.#types.get(e.typeName);
      return def?.role === 'edge';
    });

    this.batch(() => {
      for (const elem of [...nodes, ...edges]) {
        const def = this.#types.get(elem.typeName);
        if (!def) {
          console.warn(`[rendx-graph-plugin] Cannot restore element: type "${elem.typeName}" not registered`);
          continue;
        }
        this.add(elem.typeName, elem.data as never, {layer: elem.layer, deps: elem.deps});
      }
    });
  }

  // ── 类型注册 ──

  register(name: string, def: ElementDef): void {
    this.#types.set(name, def);
  }

  // ── CRUD ──

  add<T>(type: string, data: T & (NodeBase | EdgeBase), options?: {layer?: string; deps?: string[]}): Element<T> {
    const def = this.#types.get(type);
    if (!def) throw new Error(`Unknown element type: "${type}"`);

    const id = data.id;
    if (this.#elements.has(id)) throw new Error(`Element "${id}" already exists`);

    // 自动派生 layer 和 deps
    let layer: string;
    let deps: string[];

    if (def.role === 'edge') {
      layer = options?.layer ?? 'edges';
      const edgeData = data as unknown as EdgeBase;
      deps = options?.deps ?? [edgeData.source, edgeData.target];
    } else {
      layer = options?.layer ?? 'nodes';
      deps = options?.deps ?? [];
    }

    const el = new ElementImpl<T>(id, type, def, data, this, layer, deps, elId => this.notifyUpdate(elId));

    // 挂载到场景
    const targetGroup = layer === 'edges' ? this.#edgesGroup : this.#nodesGroup;
    targetGroup.add(el.group);

    this.#elements.set(id, el as unknown as ElementImpl);

    // 注册依赖追踪
    for (const depId of deps) {
      if (!this.#dependents.has(depId)) {
        this.#dependents.set(depId, new Set());
      }
      this.#dependents.get(depId)!.add(id);
    }

    // 通知
    if (!this.#batching) {
      this.#syncState();
      this.#app.bus.emit('graph:added', el);
    } else {
      this.#batchAdded = true;
    }

    return el as unknown as Element<T>;
  }

  remove(id: string): boolean {
    const el = this.#elements.get(id);
    if (!el) return false;

    // 移除依赖追踪
    for (const depId of el.deps) {
      const set = this.#dependents.get(depId);
      if (set) {
        set.delete(id);
        if (set.size === 0) this.#dependents.delete(depId);
      }
    }

    // 从场景卸载
    const parent = el.group.parent;
    if (parent) {
      parent.remove(el.group);
    }

    el.dispose();
    this.#elements.delete(id);

    if (!this.#batching) {
      this.#syncState();
      this.#app.bus.emit('graph:removed', id);
    } else {
      this.#batchRemoved = true;
    }

    return true;
  }

  /**
   * 更新元素并触发依赖链。
   * 当外部调用 el.update() 时，GraphPlugin 监听不到，所以通过此内部路由。
   * 但当前设计中 el.update() 直接在 ElementImpl 中执行。
   * 依赖触发通过 add() 时注册的追踪机制实现。
   */
  #triggerDependents(id: string): void {
    const deps = this.#dependents.get(id);
    if (!deps) return;
    for (const depId of deps) {
      const depEl = this.#elements.get(depId);
      if (depEl) {
        // 强制重渲染依赖元素（重建子树）
        depEl.update({} as never);
      }
    }
  }

  // ── GraphQuery 实现 ──

  get<T = Record<string, unknown>>(id: string): Element<T> | undefined {
    return this.#elements.get(id) as unknown as Element<T> | undefined;
  }

  has(id: string): boolean {
    return this.#elements.has(id);
  }

  get count(): number {
    return this.#elements.size;
  }

  getIds(): string[] {
    return [...this.#elements.keys()];
  }

  getAll(): Element[] {
    return [...this.#elements.values()];
  }

  getNodes(): Element<NodeBase>[] {
    return [...this.#elements.values()].filter(el => el.role === 'node') as unknown as Element<NodeBase>[];
  }

  getEdges(): Element<EdgeBase>[] {
    return [...this.#elements.values()].filter(el => el.role === 'edge') as unknown as Element<EdgeBase>[];
  }

  getEdgesOf(nodeId: string): Element<EdgeBase>[] {
    return [...this.#elements.values()].filter(el => {
      if (el.role !== 'edge') return false;
      const data = el.data as unknown as EdgeBase;
      return data.source === nodeId || data.target === nodeId;
    }) as unknown as Element<EdgeBase>[];
  }

  // ── 批量操作 ──

  batch(fn: () => void): void {
    this.#batching = true;
    this.#batchAdded = false;
    this.#batchRemoved = false;

    try {
      fn();
    } finally {
      this.#batching = false;
      this.#syncState();

      if (this.#batchAdded) {
        this.#app.bus.emit('graph:added');
      }
      if (this.#batchRemoved) {
        this.#app.bus.emit('graph:removed');
      }
    }
  }

  // ── internal ──

  #syncState(): void {
    this.#app.setState('graph:elements', this.getIds());
  }

  /**
   * 通知 graph 某个元素已被更新（由 ElementImpl.update 调用的外部入口）。
   * 这通过在 add 时对 ElementImpl 进行 monkey-patch 来实现。
   */
  notifyUpdate(id: string): void {
    this.#triggerDependents(id);
  }
}

/**
 * 创建 GraphPlugin 实例。
 */
export function graphPlugin(): GraphPlugin {
  return new GraphPlugin();
}
