/* ══════════════════════════════════════════════
   Rendx Graph Editor — Node type definitions
   ══════════════════════════════════════════════ */

import {Node} from 'rendx-engine';
import {createNode} from 'rendx-graph-plugin';
import type {NodeBase} from 'rendx-graph-plugin';

/* ── Theme colors per node type ── */
export const NODE_THEMES: Record<string, {fill: string; stroke: string; text: string; portStroke: string; label: string}> = {
  start: {
    fill: '#52c41a',
    stroke: '#389e0d',
    text: '#fff',
    portStroke: '#52c41a',
    label: '开始',
  },
  end: {
    fill: '#ff4d4f',
    stroke: '#cf1322',
    text: '#fff',
    portStroke: '#ff4d4f',
    label: '结束',
  },
  process: {
    fill: '#1890ff',
    stroke: '#096dd9',
    text: '#fff',
    portStroke: '#1890ff',
    label: '处理',
  },
  condition: {
    fill: '#faad14',
    stroke: '#d48806',
    text: '#fff',
    portStroke: '#faad14',
    label: '条件',
  },
  data: {
    fill: '#722ed1',
    stroke: '#531dab',
    text: '#fff',
    portStroke: '#722ed1',
    label: '数据',
  },
  custom: {
    fill: '#13c2c2',
    stroke: '#08979c',
    text: '#fff',
    portStroke: '#13c2c2',
    label: '自定义',
  },
};

export const DEFAULT_NODE_W = 140;
export const DEFAULT_NODE_H = 60;

/* ── Port metrics ── */
const PORT_R = 5;

/* ── Shared node type data ── */
export interface NodeData extends NodeBase {
  nodeType: string;
  title?: string;
  color?: string;
}

/* ── Create all node type definitions ── */

export function createAllNodeDefs() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defs: Record<string, ReturnType<typeof createNode<any>>> = {};

  // A single generic node definition driven by `nodeType`
  const GenericNode = createNode<NodeData>({
    render: (ctx, data) => {
      const w = ctx.width;
      const h = ctx.height;
      const theme = NODE_THEMES[data.nodeType] ?? NODE_THEMES.process;
      const title = data.title ?? theme.label;

      // Background — rounded rect
      const bg = Node.create('round', {
        fill: theme.fill,
        stroke: theme.stroke,
        strokeWidth: 2,
        shadowColor: 'rgba(0,0,0,0.18)',
        shadowBlur: 8,
        shadowOffsetY: 2,
      });
      bg.shape.from(0, 0, w, h);
      bg.shape.options(8, 8);
      ctx.group.add(bg);

      // Title text
      const label = Node.create('text', {
        fill: theme.text,
        fontSize: 13,
        fontWeight: 'bold',
        textAnchor: 'middle',
        dominantBaseline: 'central',
      });
      label.shape.from(title, w / 2, h / 2);
      ctx.group.add(label);

      // Ports — left (input)
      const leftPort = Node.create('circle', {
        fill: '#fff',
        stroke: theme.portStroke,
        strokeWidth: 2,
      });
      leftPort.shape.from(0, h / 2, PORT_R);
      leftPort.data = {role: 'port', side: 'left'};
      ctx.group.add(leftPort);

      // Ports — right (output)
      const rightPort = Node.create('circle', {
        fill: '#fff',
        stroke: theme.portStroke,
        strokeWidth: 2,
      });
      rightPort.shape.from(w, h / 2, PORT_R);
      rightPort.data = {role: 'port', side: 'right'};
      ctx.group.add(rightPort);

      // For condition type — add extra top/bottom ports
      if (data.nodeType === 'condition') {
        const topPort = Node.create('circle', {
          fill: '#fff',
          stroke: theme.portStroke,
          strokeWidth: 2,
        });
        topPort.shape.from(w / 2, 0, PORT_R);
        topPort.data = {role: 'port', side: 'top'};
        ctx.group.add(topPort);

        const bottomPort = Node.create('circle', {
          fill: '#fff',
          stroke: theme.portStroke,
          strokeWidth: 2,
        });
        bottomPort.shape.from(w / 2, h, PORT_R);
        bottomPort.data = {role: 'port', side: 'bottom'};
        ctx.group.add(bottomPort);
      }
    },
    // PortResolver — 通过 data.role 识别端口
    traits: {
      connectable: group => group.children.filter(c => c.data?.role === 'port'),
    },
  });

  // Register each type name mapping to the same generic definition
  for (const typeName of Object.keys(NODE_THEMES)) {
    defs[typeName] = GenericNode;
  }

  return defs;
}
