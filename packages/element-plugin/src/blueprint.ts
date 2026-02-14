/**
 * Blueprint 声明式节点结构系统。
 *
 * 将任意节点布局描述为纯数据（Section + Cell），
 * 由通用渲染器 `renderBlueprint()` 统一消费。
 * 无需为每种节点类型编写自定义渲染函数。
 *
 * 架构：
 *   NodeBlueprint
 *     └── sections: Section[]
 *           ├── HeaderSection  — 标题栏（背景 + 居中文字）
 *           ├── DividerSection — 分隔线（零高度）
 *           ├── RowSection     — 内容行（标签/单元格 + 端口指示器）
 *           └── SpacerSection  — 空白间距
 *
 * @example
 * ```ts
 * import { blueprintRenderer, createListBlueprint } from 'rendx-element-plugin';
 *
 * element.registerType('blueprint', blueprintRenderer);
 *
 * // 方式 1：手写蓝图
 * element.addNode({
 *   type: 'blueprint', x: 0, y: 0, width: 200,
 *   data: {
 *     blueprint: {
 *       sections: [
 *         { type: 'header', label: 'MyNode', fill: '#6e8efb' },
 *         { type: 'divider' },
 *         { type: 'row', id: 'a', label: 'input', ports: { left: 1 } },
 *       ],
 *     },
 *   },
 * });
 *
 * // 方式 2：用工厂函数生成蓝图
 * element.addNode({
 *   type: 'blueprint', x: 0, y: 0, width: 220,
 *   data: {
 *     blueprint: createListBlueprint('QueueControl', {
 *       rows: [
 *         { id: 'in1', label: 'input1' },
 *         { id: 'in2', label: 'input2' },
 *       ],
 *       portColor: '#6e8efb',
 *     }),
 *   },
 * });
 * ```
 */

import {Node, Group} from 'rendx-engine';

import type {ElementNodeData, ElementRenderer, PortDefinition, RenderResult} from './types';

// ================================================================
// Section Types
// ================================================================

/** 标题栏分节 */
export interface HeaderSection {
  type: 'header';
  /** 高度（px），默认 30 */
  height?: number;
  /** 标题文本 */
  label?: string;
  /** 背景色（半透明覆盖），不设则无背景 */
  fill?: string;
  /** 文字色，默认 '#333' */
  textColor?: string;
  /** 字号，默认 13 */
  fontSize?: number;
  /** 字重，默认 'bold' */
  fontWeight?: string;
}

/** 分隔线分节（零高度，绘制于当前 y 位置） */
export interface DividerSection {
  type: 'divider';
  /** 线色，默认继承 body stroke */
  color?: string;
  /** 线宽，默认 0.5 */
  thickness?: number;
  /** 透明度，默认 0.4 */
  opacity?: number;
  /** 左右缩进（px），默认 0 */
  indent?: number;
}

/** 行分节 — 可包含端口和内容单元 */
export interface RowSection {
  type: 'row';
  /** 行唯一标识（用于端口 id 生成） */
  id: string;
  /** 高度（px），默认 30 */
  height?: number;
  /** 简单标签文本（无 cells 时使用） */
  label?: string;
  /** 高级布局：内容单元列表（覆盖 label） */
  cells?: Cell[];
  /** 端口配置 */
  ports?: {
    /** 左侧端口数量，默认 0 */
    left?: number;
    /** 右侧端口数量，默认 0 */
    right?: number;
  };
}

/** 空白间距分节 */
export interface SpacerSection {
  type: 'spacer';
  /** 高度（px），默认 10 */
  height?: number;
}

/** 所有分节类型 */
export type Section = HeaderSection | DividerSection | RowSection | SpacerSection;

// ================================================================
// Cell Types
// ================================================================

/** 文本单元 */
export interface TextCell {
  type: 'text';
  /** 文本内容 */
  content: string;
  /** 文字色，默认 '#555' */
  color?: string;
  /** 字号，默认 12 */
  fontSize?: number;
  /** 字重 */
  fontWeight?: string;
}

/** 间距单元 */
export interface SpacerCell {
  type: 'spacer';
  /** 固定宽度（px），默认 8 */
  width?: number;
}

/** 所有单元类型 */
export type Cell = TextCell | SpacerCell;

// ================================================================
// Node Blueprint
// ================================================================

/**
 * 节点蓝图 — 纯数据的节点结构描述。
 *
 * 通过 sections 数组从上到下声明节点内部的分区布局，
 * 渲染器自动计算总高度和端口坐标。
 */
export interface NodeBlueprint {
  /** 从上到下排列的分节列表 */
  sections: Section[];
  /** 端口指示器尺寸（px），默认 8 */
  portSize?: number;
  /** 端口指示器颜色，默认 '#6e8efb' */
  portColor?: string;
  /** 背景圆角半径，默认 4 */
  cornerRadius?: number;
}

// ================================================================
// Height / Port Calculation
// ================================================================

/** 获取单个分节的高度 */
function getSectionHeight(section: Section): number {
  switch (section.type) {
    case 'header':
      return section.height ?? 30;
    case 'divider':
      return 0;
    case 'row':
      return section.height ?? 30;
    case 'spacer':
      return section.height ?? 10;
  }
}

/** 计算蓝图总高度 */
export function calcBlueprintHeight(blueprint: NodeBlueprint): number {
  return blueprint.sections.reduce((h, s) => h + getSectionHeight(s), 0);
}

/** 根据蓝图生成端口定义 */
export function generateBlueprintPorts(blueprint: NodeBlueprint): PortDefinition[] {
  const totalHeight = calcBlueprintHeight(blueprint);
  if (totalHeight === 0) return [];

  const ports: PortDefinition[] = [];
  let y = 0;

  for (const section of blueprint.sections) {
    const sh = getSectionHeight(section);

    if (section.type === 'row' && section.ports) {
      const rowCenter = y + sh / 2;
      const offset = rowCenter / totalHeight;
      const leftCount = section.ports.left ?? 0;
      const rightCount = section.ports.right ?? 0;

      for (let i = 0; i < leftCount; i++) {
        ports.push({id: `${section.id}:in:${i}`, position: 'left', offset});
      }
      for (let i = 0; i < rightCount; i++) {
        ports.push({id: `${section.id}:out:${i}`, position: 'right', offset});
      }
    }

    y += sh;
  }

  return ports;
}

// ================================================================
// Render
// ================================================================

/**
 * 核心渲染函数 — 将 Blueprint 渲染为 rendx Group 树。
 *
 * 返回 RenderResult 包含：
 * - group: 渲染后的 Group
 * - height: 自动计算的总高度
 * - ports: 自动生成的端口定义
 */
export function renderBlueprint(data: ElementNodeData, blueprint: NodeBlueprint): RenderResult {
  const w = data.width ?? 200;
  const portSize = blueprint.portSize ?? 8;
  const portColor = blueprint.portColor ?? '#6e8efb';
  const cornerRadius = blueprint.cornerRadius ?? 4;
  const bodyFill = data.style?.fill ?? '#ffffff';
  const bodyStroke = data.style?.stroke ?? '#333333';
  const strokeWidth = (data.style?.strokeWidth as number) ?? 1.5;

  const totalHeight = calcBlueprintHeight(blueprint);
  const ports = generateBlueprintPorts(blueprint);

  const group = new Group();

  // 1. 背景圆角矩形
  const body = Node.create('round', {
    fill: bodyFill,
    stroke: bodyStroke,
    strokeWidth,
  });
  body.shape.from(0, 0, w, totalHeight);
  body.shape.options(cornerRadius, cornerRadius);
  body.name = '__body__';
  group.add(body);

  // 2. 逐节渲染
  let y = 0;
  blueprint.sections.forEach((section, sIndex) => {
    const sh = getSectionHeight(section);

    switch (section.type) {
      case 'header': {
        // 背景色覆盖层
        if (section.fill) {
          const bg = Node.create('rect', {
            fill: section.fill,
            opacity: 0.12,
          });
          bg.shape.from(1, y + 1, w - 2, sh - 1);
          bg.name = `__header-bg-${sIndex}__`;
          group.add(bg);
        }
        // 标题文字
        if (section.label) {
          const text = Node.create('text', {
            fill: section.textColor ?? '#333333',
            fontSize: section.fontSize ?? 13,
            fontWeight: section.fontWeight ?? 'bold',
            textAnchor: 'middle',
            dominantBaseline: 'central',
          });
          text.shape.from(section.label, w / 2, y + sh / 2);
          text.name = `__header-text-${sIndex}__`;
          group.add(text);
        }
        break;
      }

      case 'divider': {
        const indent = section.indent ?? 0;
        const line = Node.create('line', {
          stroke: section.color ?? bodyStroke,
          strokeWidth: section.thickness ?? 0.5,
          opacity: section.opacity ?? 0.4,
        });
        line.shape.from(indent, y, w - indent, y);
        line.name = `__divider-${sIndex}__`;
        group.add(line);
        break;
      }

      case 'row': {
        const rowCenterY = y + sh / 2;
        const hasLeftPorts = (section.ports?.left ?? 0) > 0;

        // 内容渲染
        if (section.cells && section.cells.length > 0) {
          let cx = hasLeftPorts ? portSize + 12 : 12;
          section.cells.forEach((cell, cIndex) => {
            if (cell.type === 'text') {
              const t = Node.create('text', {
                fill: cell.color ?? '#555555',
                fontSize: cell.fontSize ?? 12,
                fontWeight: cell.fontWeight,
                textAnchor: 'start',
                dominantBaseline: 'central',
              });
              t.shape.from(cell.content, cx, rowCenterY);
              t.name = `__row-${section.id}-cell-${cIndex}__`;
              group.add(t);
              // 近似文字宽度推进 x
              cx += cell.content.length * (cell.fontSize ?? 12) * 0.65;
            } else if (cell.type === 'spacer') {
              cx += cell.width ?? 8;
            }
          });
        } else if (section.label) {
          const textX = hasLeftPorts ? portSize + 12 : 12;
          const label = Node.create('text', {
            fill: '#555555',
            fontSize: 12,
            textAnchor: 'start',
            dominantBaseline: 'central',
          });
          label.shape.from(section.label, textX, rowCenterY);
          label.name = `__row-${section.id}-label__`;
          group.add(label);
        }

        // 左侧端口指示器
        for (let i = 0; i < (section.ports?.left ?? 0); i++) {
          const ind = Node.create('rect', {fill: portColor});
          ind.shape.from(-portSize / 2, rowCenterY - portSize / 2, portSize, portSize);
          ind.name = `__row-${section.id}-in-${i}__`;
          group.add(ind);
        }

        // 右侧端口指示器
        for (let i = 0; i < (section.ports?.right ?? 0); i++) {
          const ind = Node.create('rect', {fill: portColor});
          ind.shape.from(w - portSize / 2, rowCenterY - portSize / 2, portSize, portSize);
          ind.name = `__row-${section.id}-out-${i}__`;
          group.add(ind);
        }

        break;
      }

      // spacer: 无可视元素，仅占空间
    }

    y += sh;
  });

  return {group, height: totalHeight, ports};
}

// ================================================================
// Blueprint Renderer
// ================================================================

/**
 * 蓝图渲染器 — 从 `data.data.blueprint` 读取蓝图配置并渲染。
 *
 * 注册为元素类型后即可使用：
 * ```ts
 * element.registerType('blueprint', blueprintRenderer);
 * element.addNode({ type: 'blueprint', data: { blueprint: myBlueprint }, ... });
 * ```
 */
export const blueprintRenderer: ElementRenderer = data => {
  const bp = data.data?.blueprint as NodeBlueprint | undefined;
  if (!bp?.sections) {
    // 无蓝图配置：回退为简单矩形
    const group = new Group();
    const w = data.width ?? 100;
    const h = data.height ?? 60;
    const body = Node.create('rect', {
      fill: data.style?.fill ?? '#ffffff',
      stroke: data.style?.stroke ?? '#333333',
      strokeWidth: (data.style?.strokeWidth as number) ?? 1,
    });
    body.shape.from(0, 0, w, h);
    body.name = '__body__';
    group.add(body);
    return {group, height: h};
  }

  return renderBlueprint(data, bp);
};

// ================================================================
// List-Node 便捷工厂
// ================================================================

/** 行定义（createListBlueprint 的输入） */
export interface ListNodeRow {
  /** 行唯一标识（用于端口 id 生成） */
  id: string;
  /** 行标签文本 */
  label: string;
  /** 左侧输入端口数量，默认 1 */
  inputCount?: number;
  /** 右侧输出端口数量，默认 1 */
  outputCount?: number;
}

/** createListBlueprint 的配置 */
export interface ListNodeConfig {
  /** 行定义列表 */
  rows: ListNodeRow[];
  /** 标题栏高度，默认 30 */
  headerHeight?: number;
  /** 每行高度，默认 30 */
  rowHeight?: number;
  /** 端口指示器尺寸，默认 8 */
  portSize?: number;
  /** 端口指示器颜色，默认 '#6e8efb' */
  portColor?: string;
  /** 标题栏背景色 */
  headerFill?: string;
  /** 标题文字色，默认 '#333' */
  headerTextColor?: string;
  /** 行文字色，默认 '#555' */
  rowTextColor?: string;
  /** 圆角半径，默认 4 */
  cornerRadius?: number;
}

/**
 * 将列表式节点配置转换为 NodeBlueprint。
 *
 * 这是 list-node 到 blueprint 的桥梁函数：
 * 接受简化的行列表配置，输出完整的蓝图数据。
 *
 * @param label - 标题文本（不传则无标题栏）
 * @param config - 行列表配置
 * @returns 完整的 NodeBlueprint
 *
 * @example
 * ```ts
 * const bp = createListBlueprint('QueueControl', {
 *   rows: [
 *     { id: 'in1', label: 'input1' },
 *     { id: 'in2', label: 'input2' },
 *   ],
 *   portColor: '#6e8efb',
 *   headerFill: '#6e8efb',
 * });
 * ```
 */
export function createListBlueprint(label: string | undefined, config: ListNodeConfig): NodeBlueprint {
  const headerHeight = config.headerHeight ?? 30;
  const rowHeight = config.rowHeight ?? 30;
  const portSize = config.portSize ?? 8;

  const sections: Section[] = [];

  // 标题栏
  if (label) {
    sections.push({
      type: 'header',
      label,
      height: headerHeight,
      fill: config.headerFill,
      textColor: config.headerTextColor,
    });
    sections.push({type: 'divider'});
  }

  // 行
  config.rows.forEach((row, i) => {
    if (i > 0) {
      sections.push({
        type: 'divider',
        opacity: 0.2,
        indent: portSize + 4,
      });
    }
    sections.push({
      type: 'row',
      id: row.id,
      label: row.label,
      height: rowHeight,
      ports: {
        left: row.inputCount ?? 1,
        right: row.outputCount ?? 1,
      },
    });
  });

  return {
    sections,
    portSize,
    portColor: config.portColor,
    cornerRadius: config.cornerRadius,
  };
}

/**
 * 创建 list-node 渲染器 — 从 `data.data` 读取 ListNodeConfig。
 *
 * 用于把旧的 list-node 类型迁移到 blueprint 系统：
 * ```ts
 * element.registerType('list-node', createListNodeRenderer());
 * element.addNode({
 *   type: 'list-node',
 *   label: 'QueueControl',
 *   data: { rows: [...], portColor: '#6e8efb' },
 *   ...
 * });
 * ```
 */
export function createListNodeRenderer(): ElementRenderer {
  return data => {
    const config = (data.data ?? {}) as unknown as ListNodeConfig;
    if (!config.rows) {
      // 无行定义：回退为简单蓝图
      return renderBlueprint(data, {sections: []});
    }
    const bp = createListBlueprint(data.label, config);
    return renderBlueprint(data, bp);
  };
}
