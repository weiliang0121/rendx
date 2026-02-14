/**
 * Element Plugin — 类型定义。
 *
 * 零运行时，纯接口。
 * 为 createElement / Element / Graph 提供类型约束。
 */

import type {Group} from 'rendx-engine';

// ========================
// Element Base Data
// ========================

/**
 * 所有 Element 实例共享的基础定位字段。
 * 用户自定义数据 T 与此合并作为完整的 element data。
 */
export interface ElementBase {
  /** 唯一标识 */
  id: string;
  /** X 坐标（世界坐标） */
  x: number;
  /** Y 坐标（世界坐标） */
  y: number;
  /** 宽度（px） */
  width?: number;
  /** 高度（px） */
  height?: number;
}

/** 完整的 element data = 基础定位 + 用户自定义数据 */
export type ElementData<T = Record<string, unknown>> = ElementBase & T;

// ========================
// Element Options (add 时的元数据)
// ========================

/** graph.add() 的选项 — 控制元素的挂载层和依赖关系 */
export interface ElementOptions {
  /**
   * 挂载到哪个图层。
   * - 'nodes' → graph:nodes 层（zIndex 1，在上方）
   * - 'edges' → graph:edges 层（zIndex 0，在下方）
   * - 不指定 → 默认 'nodes'
   */
  layer?: 'nodes' | 'edges';

  /**
   * 依赖的其他 element id 列表。
   * 当被依赖的 element 更新时，本 element 会自动重建子树。
   * 典型场景：edge 声明 deps: [sourceId, targetId]，node 移动后 edge 自动重绘。
   */
  deps?: string[];
}

// ========================
// Render Context（render fn 的上下文）
// ========================

/**
 * render 函数的上下文 — 在 fn(ctx, data, graph) 中使用。
 *
 * ctx 提供：
 * - group: 已创建好的 Group 容器（translate 已设置）
 * - width / height: 元素尺寸
 * - onCleanup(): 注册清理回调
 */
export interface ElementContext {
  /** 自动创建的 Group 容器，用户往里 add Node/子 Group */
  readonly group: Group;
  /** 元素宽度 */
  readonly width: number;
  /** 元素高度 */
  readonly height: number;
  /** 注册清理回调（update/dispose 时调用） */
  onCleanup(fn: () => void): void;
}

/**
 * 用户编写的 render 函数签名。
 * 在 Group 内用 Node.create / group.add 等 engine 原生 API 构建子树。
 * graph 提供只读查询，让 edge 类型的 render 能获取其他 element 的数据。
 */
export type ElementRenderFn<T = Record<string, unknown>> = (ctx: ElementContext, data: ElementData<T>, graph: GraphQuery) => void;

// ========================
// Element Definition
// ========================

/**
 * 元素定义 — createElement() 的返回值。
 * 持有 render 函数引用 + 类型标记，供 Graph 实例化使用。
 */
export interface ElementDef<T = Record<string, unknown>> {
  /** 标记为 element 定义（运行时类型检查用） */
  readonly __element_def__: true;
  /** 用户提供的 render 函数 */
  readonly render: ElementRenderFn<T>;
}

// ========================
// Element Instance
// ========================

/**
 * Element 实例 — 一份 data 对应一棵 Group 子树。
 *
 * 由 Graph.add() 创建，管理 data ↔ scene graph 的绑定关系。
 */
export interface Element<T = Record<string, unknown>> {
  /** 元素 ID */
  readonly id: string;
  /** 当前数据快照（只读） */
  readonly data: Readonly<ElementData<T>>;
  /** 底层 Group（可直接操作 engine API） */
  readonly group: Group;
  /** 是否已挂载到 scene */
  readonly mounted: boolean;
  /** 所在图层 */
  readonly layer: 'nodes' | 'edges';
  /** 依赖的 element id 列表 */
  readonly deps: ReadonlyArray<string>;

  /**
   * 更新数据 — 合并 partial → 清空 children → 重跑 render fn。
   * 位置变化只更新 translate，不重建子树。
   * 更新完成后，自动触发依赖本 element 的其他 element 重绘。
   */
  update(partial: Partial<ElementData<T>>): void;

  /** 销毁元素（清理回调 + 移除 group children + 从 scene 移除） */
  dispose(): void;
}

// ========================
// Graph Query（只读查询接口）
// ========================

/**
 * Graph 的只读查询接口 — 传入 render fn 第三个参数。
 *
 * 让 element 的 render 函数能感知其他 element 的存在和数据，
 * 但不能修改 graph 结构（add/remove/register）。
 */
export interface GraphQuery {
  /** 获取 Element 实例 */
  get<T>(id: string): Element<T> | undefined;
  /** 是否存在指定 id 的元素 */
  has(id: string): boolean;
  /** 所有 element id */
  getIds(): string[];
  /** 所有 Element 实例 */
  getAll(): Element<Record<string, unknown>>[];
  /** 元素总数 */
  readonly count: number;
}
