/**
 * Element 类型定义 — TypeScript Interface 即 DSL。
 *
 * 用户通过这些类型声明图元素结构，IDE 自动提供补全和校验，
 * 无需编写独立的 DSL 语法或 schema 文件。
 */

import type {Group} from 'rendx-engine';

// ========================
// Port（端口 / 连接锚点）
// ========================

/** 端口位置 — 四边 */
export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

/** 端口定义 */
export interface PortDefinition {
  /** 端口唯一标识 */
  id: string;
  /** 所在边 */
  position: PortPosition;
  /** 在边上的偏移量 (0–1)，默认 0.5（居中） */
  offset?: number;
}

// ========================
// Element Style
// ========================

/** 元素视觉样式（传递给底层 rendx Node 的 Attributes） */
export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  [key: string]: unknown;
}

// ========================
// Element Node Data
// ========================

/**
 * 图元素数据 — element 插件的核心数据结构。
 *
 * 一个 ElementNodeData 对应一个业务层"节点"（区别于渲染层的 rendx Node）。
 * element 插件负责将其映射为 rendx 的 Group → Node 树以完成渲染。
 *
 * @example
 * ```ts
 * element.addNode({
 *   id: 'node-1',
 *   type: 'rect',
 *   x: 100, y: 100,
 *   width: 200, height: 80,
 *   label: '处理器',
 *   ports: [
 *     { id: 'in',  position: 'left' },
 *     { id: 'out', position: 'right' },
 *   ],
 *   style: { fill: '#e6f7ff', stroke: '#1890ff' },
 *   data: { status: 'running' },
 * });
 * ```
 */
export interface ElementNodeData {
  /** 唯一标识 */
  id: string;
  /** 元素类型（内置: 'rect' | 'circle' | 'round'，或自定义注册类型） */
  type: string;
  /** X 坐标（世界坐标） */
  x: number;
  /** Y 坐标（世界坐标） */
  y: number;
  /** 宽度（矩形类元素使用，默认 100） */
  width?: number;
  /** 高度（矩形类元素使用，默认 60） */
  height?: number;
  /** 标签文本（显示在元素中心） */
  label?: string;
  /** 端口定义列表 */
  ports?: PortDefinition[];
  /** 视觉样式（覆盖默认值） */
  style?: ElementStyle;
  /** 用户业务数据（不影响渲染，由消费方自行使用） */
  data?: Record<string, unknown>;
}

// ========================
// Element Renderer / Updater
// ========================

/**
 * 元素渲染器 — 接收元素数据，返回一个 rendx Group 作为渲染载体。
 *
 * Group 内部可包含任意 Node/子 Group 组合。
 * 注意：返回的 Group 的 translate 由插件统一管理（不要在 renderer 内设置 translate）。
 *
 * 可返回 Group（简单模式）或 RenderResult（自动计算 height/ports）。
 */
export type ElementRenderer = (data: ElementNodeData) => Group | RenderResult;

/**
 * 渲染结果 — 允许 renderer 返回自动计算的元数据。
 *
 * - height: 覆盖 ElementNodeData.height（蓝图系统用于自动撑开）
 * - ports:  覆盖 ElementNodeData.ports（蓝图系统用于自动生成）
 */
export interface RenderResult {
  /** 渲染后的 Group */
  group: Group;
  /** 自动计算的高度（将覆盖 ElementNodeData.height） */
  height?: number;
  /** 自动生成的端口定义（将覆盖 ElementNodeData.ports） */
  ports?: PortDefinition[];
}

/**
 * 元素更新器 — 接收已有 Group 和变更数据，就地更新（避免 destroy+recreate）。
 * 可选：不提供时插件会 destroy+recreate。
 */
export type ElementUpdater = (group: Group, data: ElementNodeData, changed: Partial<ElementNodeData>) => void;
