/**
 * ElementImpl — Element 实例的内部实现。
 *
 * 管理 data ↔ Group 子树的绑定：
 * - 创建时：new Group → translate → 调用 render fn 填充子树
 * - update 时：合并 data → 仅位移变化走 translate，其他走重建（清空 children → 重跑 fn）
 * - dispose 时：调用 cleanup → 清空 children
 *
 * 不直接操作 scene 挂载/卸载 —— 那是 Graph 的职责。
 */

import {Group} from 'rendx-engine';

import type {Element, ElementBase, ElementContext, ElementData, ElementDef, GraphQuery} from './types';

export class ElementImpl<T = Record<string, unknown>> implements Element<T> {
  readonly group: Group;

  #def: ElementDef<T>;
  #data: ElementData<T>;
  #graph: GraphQuery;
  #cleanups: (() => void)[] = [];
  #mounted = false;

  get id(): string {
    return this.#data.id;
  }

  get data(): Readonly<ElementData<T>> {
    return this.#data;
  }

  get mounted(): boolean {
    return this.#mounted;
  }

  constructor(def: ElementDef<T>, data: ElementData<T>, graph: GraphQuery) {
    this.#def = def;
    this.#data = {...data};
    this.#graph = graph;

    // 创建 Group 容器，设置名称和初始位移
    this.group = new Group();
    this.group.name = data.id;
    this.group.translate(data.x, data.y);

    // 首次渲染
    this.#render();
  }

  // ========================
  // Lifecycle
  // ========================

  update(partial: Partial<ElementData<T>>): void {
    const prev = this.#data;

    // 合并数据（id 不可变）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {id: _, ...rest} = partial as Partial<ElementBase> & Record<string, unknown>;
    this.#data = {...this.#data, ...rest} as ElementData<T>;

    // 仅位移变化 → 不重建子树，只更新 translate
    if (this.#isPositionOnlyChange(prev, partial)) {
      this.group.translate(this.#data.x, this.#data.y);
      return;
    }

    // 位移可能也变了，先更新 translate
    if (partial.x !== undefined || partial.y !== undefined) {
      this.group.translate(this.#data.x, this.#data.y);
    }

    // 重建子树
    this.#teardown();
    this.#render();
  }

  dispose(): void {
    this.#teardown();
    this.group.removeChildren();
    this.#mounted = false;
  }

  // ── 供 Graph 内部调用 ──

  /** @internal */
  _setMounted(mounted: boolean): void {
    this.#mounted = mounted;
  }

  // ========================
  // Internal
  // ========================

  /** 执行 render fn 填充 group */
  #render(): void {
    this.#cleanups = [];

    const ctx: ElementContext = {
      group: this.group,
      width: this.#data.width ?? 0,
      height: this.#data.height ?? 0,
      onCleanup: (fn: () => void) => {
        this.#cleanups.push(fn);
      },
    };

    this.#def.render(ctx, this.#data, this.#graph);
  }

  /** 调用 cleanup 回调 + 清空 children */
  #teardown(): void {
    for (const fn of this.#cleanups) {
      fn();
    }
    this.#cleanups = [];
    this.group.removeChildren();
  }

  /** 判断是否只有 x/y 变化 */
  #isPositionOnlyChange(_prev: ElementData<T>, partial: Partial<ElementData<T>>): boolean {
    const keys = Object.keys(partial) as (keyof ElementData<T>)[];
    return keys.every(k => k === 'x' || k === 'y');
  }
}
