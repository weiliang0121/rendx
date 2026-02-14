/**
 * Graph 插件 — Element 实例的管理器。
 *
 * 职责：
 * 1. 注册 Element 类型（register）
 * 2. 实例化 Element 并自动挂载到 scene（add）
 * 3. 分层渲染：nodes 层 (zIndex 1) + edges 层 (zIndex 0)
 * 4. 依赖追踪：deps 声明，node 更新自动触发 edge 重绘
 * 5. 通过 bus + state 通知其他插件
 * 6. app.dispose() 时自动清理
 *
 * @example
 * ```ts
 * const graph = graphPlugin();
 * app.use(graph);
 *
 * graph.register('card', Card);
 * graph.register('edge', Edge);
 *
 * const n1 = graph.add('card', { id: 'n1', x: 0, y: 0, width: 100, height: 60, title: 'A' });
 * const e1 = graph.add('edge', { id: 'e1', x: 0, y: 0, source: 'n1', target: 'n2' },
 *   { layer: 'edges', deps: ['n1', 'n2'] });
 *
 * // n1 移动 → e1 自动重绘
 * n1.update({ x: 200 });
 * ```
 */

import {ElementImpl} from './element';

import type {App, Plugin} from 'rendx-engine';
import type {Element, ElementData, ElementDef, ElementOptions, GraphQuery} from './types';

export class GraphPlugin implements Plugin, GraphQuery {
  name = 'graph';

  /** 声明两个渲染层 — edges 在下方，nodes 在上方 */
  layers = [
    {name: 'graph:edges', zIndex: 0},
    {name: 'graph:nodes', zIndex: 1},
  ];

  state = [
    {
      key: 'graph:elements',
      description: '所有 element 实例的 id 列表',
      initial: [] as string[],
    },
  ];

  #app: App | null = null;

  #defs = new Map<string, ElementDef<Record<string, unknown>>>();

  #elements = new Map<string, ElementImpl<Record<string, unknown>>>();

  /** 反向索引：elementId → 依赖它的 element id 集合 */
  #dependents = new Map<string, Set<string>>();

  /** 批量操作中是否正在进行，防止中间态 syncState / bus emit */
  #batching = false;
  #batchDirty = false;

  install(app: App): void {
    this.#app = app;
  }

  // ========================
  // Type Registry
  // ========================

  /**
   * 注册 Element 类型。
   * @param name - 类型名称
   * @param def - createElement() 返回的定义
   */
  register<T>(name: string, def: ElementDef<T>): this {
    this.#defs.set(name, def as ElementDef<Record<string, unknown>>);
    return this;
  }

  /** 是否已注册指定类型 */
  hasType(name: string): boolean {
    return this.#defs.has(name);
  }

  // ========================
  // CRUD
  // ========================

  /**
   * 添加 Element 实例。
   * 自动实例化、挂载到对应层、跟踪管理。
   *
   * @param type - 已注册的类型名称
   * @param data - 元素数据（id + x/y + 用户自定义字段）
   * @param options - 可选：layer (挂载层) + deps (依赖列表)
   * @returns Element 实例
   */
  add<T>(type: string, data: ElementData<T>, options?: ElementOptions): Element<T> {
    if (!this.#app) throw new Error('Graph plugin is not installed. Call app.use(graph) first.');

    const def = this.#defs.get(type);
    if (!def) throw new Error(`Unknown element type: "${type}". Register it first with graph.register().`);

    if (this.#elements.has(data.id)) {
      throw new Error(`Element "${data.id}" already exists.`);
    }

    const layer = options?.layer ?? 'nodes';
    const deps = options?.deps ?? [];

    // 实例化
    const el = new ElementImpl<T>(def as ElementDef<T>, data, this, layer, deps);

    // 注册依赖追踪回调
    el._setOnUpdate((updatedId: string) => {
      this.#invalidateDependents(updatedId);
    });

    // 挂载到对应层
    const targetLayer = this.#app.getLayer(layer === 'edges' ? 'graph:edges' : 'graph:nodes');
    if (targetLayer) {
      targetLayer.add(el.group);
    } else {
      // 回退到默认 scene
      this.#app.scene.add(el.group);
    }
    el._setMounted(true);

    // 建立依赖反向索引
    for (const depId of deps) {
      let set = this.#dependents.get(depId);
      if (!set) {
        set = new Set();
        this.#dependents.set(depId, set);
      }
      set.add(data.id);
    }

    // 跟踪
    this.#elements.set(data.id, el as ElementImpl<Record<string, unknown>>);
    if (!this.#batching) {
      this.#syncState();
      this.#app.bus.emit('graph:added');
    } else {
      this.#batchDirty = true;
    }

    return el;
  }

  /**
   * 移除 Element 实例。
   * @returns 是否找到并移除
   */
  remove(id: string): boolean {
    const el = this.#elements.get(id);
    if (!el) return false;

    // 从 scene/层 卸载
    if (this.#app && el.group.parent) {
      el.group.parent.remove(el.group);
    }
    el.dispose();

    // 清理依赖反向索引
    for (const depId of el.deps) {
      const set = this.#dependents.get(depId);
      if (set) {
        set.delete(id);
        if (set.size === 0) this.#dependents.delete(depId);
      }
    }
    // 也清理以此 element 为依赖目标的反向索引
    this.#dependents.delete(id);

    this.#elements.delete(id);
    if (!this.#batching) {
      this.#syncState();
      this.#app?.bus.emit('graph:removed');
    } else {
      this.#batchDirty = true;
    }

    return true;
  }

  // ========================
  // Batch Operations
  // ========================

  /**
   * 批量操作 — 在回调内的 add/remove 不会逐次触发 syncState 和 bus emit。
   * 回调执行完毕后统一同步一次。
   *
   * @example
   * ```ts
   * graph.batch(() => {
   *   graph.add('card', {...});
   *   graph.add('card', {...});
   *   graph.add('edge', {...}, { layer: 'edges', deps: [...] });
   * });
   * ```
   */
  batch(fn: () => void): void {
    this.#batching = true;
    this.#batchDirty = false;
    try {
      fn();
    } finally {
      this.#batching = false;
      if (this.#batchDirty) {
        this.#syncState();
        this.#app?.bus.emit('graph:added');
      }
    }
  }

  // ========================
  // Query
  // ========================

  /** 获取 Element 实例 */
  get<T>(id: string): Element<T> | undefined {
    return this.#elements.get(id) as Element<T> | undefined;
  }

  /** 是否存在指定 id 的元素 */
  has(id: string): boolean {
    return this.#elements.has(id);
  }

  /** 所有 element id */
  getIds(): string[] {
    return Array.from(this.#elements.keys());
  }

  /** 所有 Element 实例 */
  getAll(): Element<Record<string, unknown>>[] {
    return Array.from(this.#elements.values());
  }

  /** 元素总数 */
  get count(): number {
    return this.#elements.size;
  }

  // ========================
  // Lifecycle
  // ========================

  dispose(): void {
    for (const el of this.#elements.values()) {
      if (el.group.parent) {
        el.group.parent.remove(el.group);
      }
      el.dispose();
    }
    this.#elements.clear();
    this.#defs.clear();
    this.#dependents.clear();
    this.#app = null;
  }

  // ========================
  // Internal
  // ========================

  #syncState(): void {
    if (!this.#app) return;
    this.#app.setState('graph:elements', this.getIds());
  }

  /**
   * 当 elementId 的数据变化时，找出所有 deps 包含它的 element 并重绘。
   * 使用反向索引 #dependents 实现 O(依赖者数量) 查找，避免全量遍历。
   */
  #invalidateDependents(elementId: string): void {
    const depSet = this.#dependents.get(elementId);
    if (!depSet) return;
    for (const depElId of depSet) {
      const depEl = this.#elements.get(depElId);
      if (depEl) depEl._invalidate();
    }
  }
}

/** 创建 Graph 插件实例 */
export function graphPlugin(): GraphPlugin {
  return new GraphPlugin();
}
