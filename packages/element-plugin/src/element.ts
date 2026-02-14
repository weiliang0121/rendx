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

import type {Element, ElementBase, ElementContext, ElementData, ElementDef, PortInfo, PortPosition} from './types';

export class ElementImpl<T = Record<string, unknown>> implements Element<T> {
  readonly group: Group;

  #def: ElementDef<T>;
  #data: ElementData<T>;
  #ports: PortInfo[] = [];
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

  get ports(): ReadonlyArray<PortInfo> {
    return this.#ports;
  }

  constructor(def: ElementDef<T>, data: ElementData<T>) {
    this.#def = def;
    this.#data = {...data};

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

  getPortPosition(portId: string): [number, number] | null {
    const port = this.#ports.find(p => p.id === portId);
    if (!port) return null;

    const w = this.#data.width ?? 0;
    const h = this.#data.height ?? 0;
    const offset = port.offset ?? 0.5;
    const x = this.#data.x;
    const y = this.#data.y;

    switch (port.position) {
      case 'top':
        return [x + w * offset, y];
      case 'bottom':
        return [x + w * offset, y + h];
      case 'left':
        return [x, y + h * offset];
      case 'right':
        return [x + w, y + h * offset];
    }
  }

  getPortPositions(): Record<string, [number, number]> {
    const result: Record<string, [number, number]> = {};
    for (const port of this.#ports) {
      const pos = this.getPortPosition(port.id);
      if (pos) result[port.id] = pos;
    }
    return result;
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
    this.#ports = [];
    this.#cleanups = [];

    const ctx: ElementContext = {
      group: this.group,
      width: this.#data.width ?? 0,
      height: this.#data.height ?? 0,
      port: (id: string, position: PortPosition, offset?: number) => {
        this.#ports.push({id, position, offset});
      },
      onCleanup: (fn: () => void) => {
        this.#cleanups.push(fn);
      },
    };

    this.#def.render(ctx, this.#data);
  }

  /** 调用 cleanup 回调 + 清空 children */
  #teardown(): void {
    for (const fn of this.#cleanups) {
      fn();
    }
    this.#cleanups = [];
    this.#ports = [];
    this.group.removeChildren();
  }

  /** 判断是否只有 x/y 变化 */
  #isPositionOnlyChange(_prev: ElementData<T>, partial: Partial<ElementData<T>>): boolean {
    const keys = Object.keys(partial) as (keyof ElementData<T>)[];
    return keys.every(k => k === 'x' || k === 'y');
  }
}
