/**
 * Graph 插件 — Element 实例的管理器。
 *
 * 职责：
 * 1. 注册 Element 类型（register）
 * 2. 实例化 Element 并自动挂载到 scene（add）
 * 3. 跟踪所有 Element 实例的生命周期
 * 4. 通过 bus + state 通知其他插件
 * 5. app.dispose() 时自动清理
 *
 * @example
 * ```ts
 * const graph = graphPlugin();
 * app.use(graph);
 *
 * graph.register('card', Card);
 *
 * const el = graph.add('card', { id: 'c1', x: 100, y: 50, width: 200, height: 80, title: 'Hi' });
 * el.update({ title: 'Updated' });
 *
 * graph.remove('c1');
 * ```
 */

import {ElementImpl} from './element';

import type {App, Plugin} from 'rendx-engine';
import type {Element, ElementData, ElementDef} from './types';

export class GraphPlugin implements Plugin {
  name = 'graph';

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
    this.#defs.set(name, def);
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
   * 自动实例化、挂载到 scene、跟踪管理。
   *
   * @param type - 已注册的类型名称
   * @param data - 元素数据（id + x/y + 用户自定义字段）
   * @returns Element 实例
   */
  add<T>(type: string, data: ElementData<T>): Element<T> {
    if (!this.#app) throw new Error('Graph plugin is not installed. Call app.use(graph) first.');

    const def = this.#defs.get(type);
    if (!def) throw new Error(`Unknown element type: "${type}". Register it first with graph.register().`);

    if (this.#elements.has(data.id)) {
      throw new Error(`Element "${data.id}" already exists.`);
    }

    // 实例化
    const el = new ElementImpl<T>(def as ElementDef<T>, data);

    // 挂载到 scene
    this.#app.scene.add(el.group);
    el._setMounted(true);

    // 跟踪
    this.#elements.set(data.id, el);
    this.#syncState();
    this.#app.bus.emit('graph:added');

    return el;
  }

  /**
   * 移除 Element 实例。
   * @returns 是否找到并移除
   */
  remove(id: string): boolean {
    const el = this.#elements.get(id);
    if (!el) return false;

    // 从 scene 卸载
    if (this.#app && el.group.parent) {
      el.group.parent.remove(el.group);
    }
    el.dispose();

    this.#elements.delete(id);
    this.#syncState();
    this.#app?.bus.emit('graph:removed');

    return true;
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
    this.#app = null;
  }

  // ========================
  // Internal
  // ========================

  #syncState(): void {
    if (!this.#app) return;
    this.#app.setState('graph:elements', this.getIds());
  }
}

/** 创建 Graph 插件实例 */
export function graphPlugin(): GraphPlugin {
  return new GraphPlugin();
}
