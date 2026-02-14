/**
 * Element Plugin — 类型定义。
 *
 * 零运行时，纯接口。
 * 为 createElement / Element / Graph 提供类型约束。
 */

import type {Group} from 'rendx-engine';

// ========================
// Port（连接锚点）
// ========================

/** 端口位置 — 四边 */
export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

/** 端口定义 */
export interface PortInfo {
  /** 端口唯一标识 */
  id: string;
  /** 所在边 */
  position: PortPosition;
  /** 在边上的偏移量 (0–1)，默认 0.5（居中） */
  offset?: number;
}

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
// Render Context（render fn 的上下文）
// ========================

/**
 * render 函数的上下文 — 在 fn(ctx, data) 中使用。
 *
 * ctx 提供：
 * - group: 已创建好的 Group 容器（translate 已设置）
 * - width / height: 元素尺寸
 * - port(): 声明端口
 * - onCleanup(): 注册清理回调
 */
export interface ElementContext {
  /** 自动创建的 Group 容器，用户往里 add Node/子 Group */
  readonly group: Group;
  /** 元素宽度 */
  readonly width: number;
  /** 元素高度 */
  readonly height: number;
  /** 声明一个端口 */
  port(id: string, position: PortPosition, offset?: number): void;
  /** 注册清理回调（update/dispose 时调用） */
  onCleanup(fn: () => void): void;
}

/**
 * 用户编写的 render 函数签名。
 * 在 Group 内用 Node.create / group.add 等 engine 原生 API 构建子树。
 */
export type ElementRenderFn<T = Record<string, unknown>> = (ctx: ElementContext, data: ElementData<T>) => void;

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
  /** 当前端口列表 */
  readonly ports: ReadonlyArray<PortInfo>;

  /**
   * 更新数据 — 合并 partial → 清空 children → 重跑 render fn。
   * 位置变化只更新 translate，不重建子树。
   */
  update(partial: Partial<ElementData<T>>): void;

  /**
   * 获取端口的世界坐标。
   * @returns [x, y] 或 null（端口不存在时）
   */
  getPortPosition(portId: string): [number, number] | null;

  /**
   * 获取所有端口的世界坐标。
   * @returns Record<portId, [x, y]>
   */
  getPortPositions(): Record<string, [number, number]>;

  /** 销毁元素（清理回调 + 移除 group children + 从 scene 移除） */
  dispose(): void;
}
