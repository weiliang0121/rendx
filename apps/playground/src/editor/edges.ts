/* ══════════════════════════════════════════════
   Rendx Graph Editor — Edge type definition
   ══════════════════════════════════════════════ */

import {Node} from 'rendx-engine';
import {createEdge} from 'rendx-graph-plugin';
import {Path} from 'rendx-path';
import {bumpX} from 'rendx-curve';

import type {EdgeBase} from 'rendx-graph-plugin';

export interface EdgeData extends EdgeBase {
  edgeColor?: string;
  sourcePort?: {side: string};
  targetPort?: {side: string};
}

/**
 * Get anchor point on a node by port side
 */
function getAnchor(nodeData: {x: number; y: number; width?: number; height?: number}, side?: string): [number, number] {
  const w = nodeData.width ?? 140;
  const h = nodeData.height ?? 60;
  switch (side) {
    case 'left':
      return [nodeData.x, nodeData.y + h / 2];
    case 'right':
      return [nodeData.x + w, nodeData.y + h / 2];
    case 'top':
      return [nodeData.x + w / 2, nodeData.y];
    case 'bottom':
      return [nodeData.x + w / 2, nodeData.y + h];
    default:
      return [nodeData.x + w, nodeData.y + h / 2];
  }
}

export function createBezierEdgeDef() {
  return createEdge<EdgeData>((ctx, data) => {
    const src = ctx.source;
    const tgt = ctx.target;
    if (!src || !tgt) return;

    const sData = src.data as {x: number; y: number; width?: number; height?: number};
    const tData = tgt.data as {x: number; y: number; width?: number; height?: number};
    const sp = data.sourcePort;
    const tp = data.targetPort;

    const [sx, sy] = getAnchor(sData, sp?.side);
    const [tx, ty] = getAnchor(tData, tp?.side);

    const p = new Path();
    bumpX(p, [
      [sx, sy],
      [tx, ty],
    ]);
    const d = p.toString();

    // Hit area — transparent wide stroke for click detection
    const hitArea = Node.create('path', {
      stroke: 'transparent',
      strokeWidth: 10,
      fill: 'none',
    });
    hitArea.shape.from(d);
    ctx.group.add(hitArea);

    // Edge visual stroke — does not receive pointer events
    const pathNode = Node.create('path', {
      stroke: data.edgeColor ?? '#6c7086',
      strokeWidth: 2,
      fill: 'none',
    });
    pathNode.setPointerEvents(false);
    pathNode.shape.from(d);
    ctx.group.add(pathNode);

    // Arrow head at target — does not receive pointer events
    const arrowSize = 8;
    const angle = Math.atan2(ty - sy, tx - sx);
    const ax1 = tx - arrowSize * Math.cos(angle - Math.PI / 6);
    const ay1 = ty - arrowSize * Math.sin(angle - Math.PI / 6);
    const ax2 = tx - arrowSize * Math.cos(angle + Math.PI / 6);
    const ay2 = ty - arrowSize * Math.sin(angle + Math.PI / 6);

    const arrowPath = new Path();
    arrowPath.M(tx, ty);
    arrowPath.L(ax1, ay1);
    arrowPath.M(tx, ty);
    arrowPath.L(ax2, ay2);

    const arrow = Node.create('path', {
      stroke: data.edgeColor ?? '#6c7086',
      strokeWidth: 2,
      fill: 'none',
    });
    arrow.setPointerEvents(false);
    arrow.shape.from(arrowPath.toString());
    ctx.group.add(arrow);

    // Mark group as selectable edge
    ctx.group.addClassName('selectable');
    ctx.group.addClassName('graph-edge');
  });
}
