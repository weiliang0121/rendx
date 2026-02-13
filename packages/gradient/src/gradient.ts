import {setSVGAttrs, createSvgEl} from '@dye/dom';

import type {AO, GradientType, GradientStops, GradientOptions} from '@dye/core';

// ── DSL 解析 ─────────────────────────────────────────

// DSL 格式：
//   l(id, [x0,y0,x1,y1], [[0,'#000'],[1,'#fff']])
//   r(id, [cx,cy,r0,cx,cy,r1], [[0,'#000'],[1,'#fff']])

const GRADIENT_RE = /(l|r)\((.+?), \[(.+?)\], \[(.+?)\]\)/;
const STOPS_RE = /\[\d+, '[^']*'\]/g;
const STOP_RE = /\d+|'[^']*'/g;

const parseType = (key: string): GradientType => (key === 'l' ? 'linear' : 'radial');

const parseDirection = (str: string): number[] => str.split(',').map(Number);

const parseStops = (str: string): GradientStops =>
  (str.match(STOPS_RE) ?? []).map(s => {
    const [offset, color] = s.match(STOP_RE) ?? [];
    return [Number(offset), color];
  }) as GradientStops;

/**
 * 解析渐变 DSL 字符串为 GradientOptions
 * @example parse("l(g1, [0,0,1,0], [[0,'#000'],[1,'#fff']])")
 */
const parse = (command: string): GradientOptions => {
  const match = command.match(GRADIENT_RE);
  if (!match) throw new Error('Invalid gradient command');
  const [, key, id, dirStr, stopsStr] = match;
  return {id, type: parseType(key), direction: parseDirection(dirStr), stops: parseStops(stopsStr)};
};

// ── 通用 ─────────────────────────────────────────────

/**
 * 将归一化方向坐标映射到像素区域
 */
const resolveDirection = (type: GradientType, direction: number[], x: number, y: number, w: number, h: number): number[] => {
  if (type === 'linear') {
    const [x0 = 0, y0 = 0, x1 = 1, y1 = 0] = direction;
    return [x + w * x0, y + h * y0, x + w * x1, y + h * y1];
  }
  if (type === 'radial') {
    const [x1 = 0.5, y1 = 0.5, r1 = 0.5, x2 = 0.5, y2 = 0.5, r2 = 0] = direction;
    const maxDim = Math.max(w, h);
    return [x + w * x1, y + h * y1, r1 * maxDim, x + w * x2, y + h * y2, r2 * maxDim];
  }
  return direction;
};

// ── Canvas ───────────────────────────────────────────

const buildCanvasGradient = (ctx: CanvasRenderingContext2D, type: GradientType, d: number[], stops: GradientStops): CanvasGradient | undefined => {
  let gradient: CanvasGradient | undefined;
  if (type === 'linear') {
    const [x1 = 0, y1 = 0, x2 = 1, y2 = 0] = d;
    gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  } else if (type === 'radial') {
    const [x1 = 0.5, y1 = 0.5, r1 = 0, x2 = 0.5, y2 = 0.5, r2 = 0.5] = d;
    gradient = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
  }
  if (!gradient) return;
  for (let i = 0; i < stops.length; i++) gradient.addColorStop(stops[i][0], stops[i][1]);
  return gradient;
};

// CanvasGradient 缓存：避免每帧重复调用 Canvas API 创建相同渐变
const CACHE_MAX = 32;
const canvasCache = new Map<string, CanvasGradient>();

const buildCacheKey = (type: GradientType, d: number[], stops: GradientStops): string => {
  let k: string = type;
  for (let i = 0; i < d.length; i++) k += ',' + d[i];
  for (let i = 0; i < stops.length; i++) k += ',' + stops[i][0] + stops[i][1];
  return k;
};

/**
 * 创建 Canvas 渐变对象（带缓存，相同参数不重复创建）
 * @param ctx canvas 2d 上下文
 * @param options 渐变配置或 DSL 字符串
 */
export const createCanvasGradient = (ctx: CanvasRenderingContext2D, options: GradientOptions | string): CanvasGradient | undefined => {
  const {type, direction, stops, region} = typeof options === 'string' ? parse(options) : options;
  const d = region ? resolveDirection(type, direction, ...region) : direction;
  const key = buildCacheKey(type, d, stops);
  const cached = canvasCache.get(key);
  if (cached) return cached;
  const gradient = buildCanvasGradient(ctx, type, d, stops);
  if (!gradient) return;
  if (canvasCache.size >= CACHE_MAX) canvasCache.delete(canvasCache.keys().next().value!);
  canvasCache.set(key, gradient);
  return gradient;
};

// ── SVG ──────────────────────────────────────────────

const toSVGAttrs = (type: GradientType, d: number[]): AO => {
  if (type === 'linear') {
    const [x1 = 0, y1 = 0, x2 = 1, y2 = 0] = d;
    return {x1, y1, x2, y2};
  }
  if (type === 'radial') {
    const [fx = 0.5, fy = 0.5, fr = 0, cx = 0.5, cy = 0.5, r = 0.5] = d;
    return {cx, cy, r, fx, fy, fr};
  }
  return {};
};

/**
 * 创建 SVG 渐变元素
 * @param options 渐变配置或 DSL 字符串
 */
export const createSVGGradient = (options: GradientOptions | string) => {
  const {id, type, direction, stops, region} = typeof options === 'string' ? parse(options) : options;

  const gradient = createSvgEl(`${type}Gradient` as keyof SVGElementTagNameMap) as SVGGradientElement;
  if (!gradient) return;

  const d = region ? resolveDirection(type, direction, ...region) : direction;
  const gradientUnits = region ? 'userSpaceOnUse' : 'objectBoundingBox';
  setSVGAttrs(gradient, {id, gradientUnits, ...toSVGAttrs(type, d)});

  for (let i = 0; i < stops.length; i++) {
    const stop = createSvgEl('stop');
    setSVGAttrs(stop, {offset: stops[i][0], stopColor: stops[i][1]});
    gradient.appendChild(stop);
  }

  return gradient;
};
