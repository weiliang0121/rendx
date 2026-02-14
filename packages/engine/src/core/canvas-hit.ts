import {isEmpty, isNone, isNum, isStr} from 'rendx-core';

import type {AO, Point} from 'rendx-core';

const isEmptyOrNone = (v: unknown) => isEmpty(v) || isNone(v);

export function setCanvasRenderingContext2StrokeAttrs(ctx: OffscreenCanvasRenderingContext2D, attributes: AO) {
  const {strokeWidth, strokeLinecap, strokeLinejoin, strokeMiterlimit, strokeDasharray, strokeDashoffset} = attributes;
  if (isNum(strokeWidth)) ctx.lineWidth = strokeWidth;
  if (isStr(strokeLinecap)) ctx.lineCap = strokeLinecap as CanvasLineCap;
  if (isStr(strokeLinejoin)) ctx.lineJoin = strokeLinejoin as CanvasLineJoin;
  if (isNum(strokeMiterlimit)) ctx.miterLimit = strokeMiterlimit;
  if (isNum(strokeDashoffset)) ctx.lineDashOffset = strokeDashoffset;
  if (isStr(strokeDasharray)) ctx.setLineDash(strokeDasharray.split(',').map(x => Number(x.trim())));
}

let _ctx: OffscreenCanvasRenderingContext2D | null = null;
const getCtx = (): OffscreenCanvasRenderingContext2D | null => {
  if (!_ctx && typeof OffscreenCanvas !== 'undefined') {
    _ctx = new OffscreenCanvas(1, 1).getContext('2d');
  }
  return _ctx;
};

const checkHit = (method: 'isPointInPath' | 'isPointInStroke', path: Path2D, point: Point, style: string, strokeAttrs?: AO): boolean => {
  const ctx = getCtx();
  if (!isEmptyOrNone(style) && ctx) {
    if (method === 'isPointInPath') return ctx.isPointInPath(path, point[0], point[1]);
    if (method === 'isPointInStroke') {
      ctx.save();
      if (strokeAttrs) setCanvasRenderingContext2StrokeAttrs(ctx, strokeAttrs);
      const flag = ctx.isPointInStroke(path, point[0], point[1]);
      ctx.restore();
      return flag;
    }
  }
  return false;
};

export const isHit = (path: Path2D, point: Point, fill: string, stroke: string, strokeAttrs?: AO): boolean => {
  if (!getCtx()) return false;
  if (checkHit('isPointInPath', path, point, fill)) return true;
  return checkHit('isPointInStroke', path, point, stroke, strokeAttrs);
};
