import type {Graphics, Node} from 'rendx-engine';
import type {Point} from 'rendx-core';

// ── 连接快照 ──────────────────────────────────────────

/**
 * 纯引擎模式下维护的连接记录。
 * connect 插件自身创建的 line Node 及其两端 Graphics 引用。
 */
export interface ConnectionRecord {
  /** 连接唯一 ID */
  id: string;
  /** 连接线节点 */
  line: Node;
  /** 起点 Graphics */
  source: Graphics;
  /** 终点 Graphics */
  target: Graphics;
}

// ── 事件 ──────────────────────────────────────────────

/** connect:start 事件负载 */
export interface ConnectStartEvent {
  /** 起点 Graphics */
  source: Graphics;
  /** 鼠标按下位置（世界坐标） */
  origin: Point;
}

/** connect:move 事件负载 */
export interface ConnectMoveEvent {
  /** 起点 Graphics */
  source: Graphics;
  /** 当前鼠标位置（世界坐标） */
  cursor: Point;
  /** 当前吸附到的目标（null 表示未吸附） */
  snapTarget: Graphics | null;
}

/** connect:complete 事件负载 */
export interface ConnectCompleteEvent {
  /** 起点 Graphics */
  source: Graphics;
  /** 终点 Graphics */
  target: Graphics;
}

/** connect:cancel 事件负载 */
export interface ConnectCancelEvent {
  /** 起点 Graphics */
  source: Graphics;
}

// ── 插件选项 ──────────────────────────────────────────

export interface ConnectPluginOptions {
  // ── 标识 ──

  /**
   * 可连接的 className 标记。
   * 只有 `hasClassName(className)` 为 true 的 Graphics 才响应连接交互。
   * @default 'connectable'
   */
  className?: string;

  // ── 过滤 ──

  /**
   * 自定义验证：是否可以从 source 连接到 target。
   * 返回 false 阻止连接完成。
   */
  canConnect?: (source: Graphics, target: Graphics) => boolean;

  /**
   * 是否允许自环（source === target）。
   * @default false
   */
  allowSelfLoop?: boolean;

  // ── 连接点 ──

  /**
   * 自定义连接点坐标计算。
   * 接收 Graphics，返回世界坐标 [x, y]。
   * 默认取 Node.getWorldBBox() 中心，Group 取 translation。
   */
  anchor?: (target: Graphics) => Point;

  // ── Graph 集成（软感知）──

  /**
   * graph-plugin 中注册的 edge 类型名。
   * 设置后连接完成时自动调用 `graph.add(edgeType, edgeData)`。
   * 未设置则走纯引擎模式（自行创建 line）。
   */
  edgeType?: string;

  /**
   * 自定义 edge 数据工厂。
   * 接收两个端点 Graphics，返回传给 `graph.add` 的完整 data。
   * 未提供时使用默认工厂（自动溯源 element ID）。
   */
  edgeFactory?: (source: Graphics, target: Graphics) => Record<string, unknown>;

  // ── 纯引擎模式配置 ──

  /**
   * 无 graph-plugin 时，自行创建的连接线样式。
   */
  lineStyle?: {
    stroke?: string;
    strokeWidth?: number;
  };

  // ── 预览线样式 ──

  /** 预览线描边颜色 @default '#1890ff' */
  previewStroke?: string;
  /** 预览线描边宽度 @default 2 */
  previewStrokeWidth?: number;
  /** 预览线虚线模式 @default [6, 4] */
  previewDash?: number[];

  // ── 吸附 ──

  /**
   * 吸附半径（像素），鼠标接近可连接目标多少像素时高亮。
   * @default 20
   */
  snapRadius?: number;

  // ── 光标 ──

  /** 连接交互中的光标样式 @default 'crosshair' */
  cursor?: string;
}
