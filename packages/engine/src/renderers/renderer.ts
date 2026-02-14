import {mat2d} from 'gl-matrix';

import {defaultsDeep} from 'rendx-core';
import {CanvasRenderer} from 'rendx-canvas';
import {SvgRenderer} from 'rendx-svg';

import type {IGraphicsRenderer} from 'rendx-core';
import type {Mat2d, Point, Size} from 'rendx-core';

import type {Node} from '../scene';
import type {TextShape} from '../shapes/text';
import type {CircleShape} from '../shapes/circle';
import type {RectShape} from '../shapes/rect';
import type {LineShape} from '../shapes/line';
import type {ImageShape} from '../shapes/image';

export interface RendererConfig {
  width: number;
  height: number;
  renderer?: 'svg' | 'canvas' | IGraphicsRenderer;
  viewport?: [number, number, number, number];
}

const DEFAULT_CONFIG: RendererConfig = {
  width: 800,
  height: 600,
  renderer: 'canvas',
};

type DrawFn = (renderer: IGraphicsRenderer, node: Node) => void;

const drawText: DrawFn = (r, n) => {
  const {x, y, text} = n.shape as TextShape;
  r.text(text, x, y);
};
const drawCircle: DrawFn = (r, n) => {
  const {cx, cy, r: radius} = n.shape as CircleShape;
  r.circle(cx, cy, radius);
};
const drawRect: DrawFn = (r, n) => {
  const {x, y, width, height} = n.shape as RectShape;
  r.rect(x, y, width, height);
};
const drawLine: DrawFn = (r, n) => {
  const {x1, y1, x2, y2} = n.shape as LineShape;
  r.line(x1, y1, x2, y2);
};
const drawPath: DrawFn = (r, n) => {
  r.path(n.shape.path());
};
const drawImage: DrawFn = (r, n) => {
  const {source, x, y, width, height} = n.shape as ImageShape;
  if (!source) return;
  r.image(source, x, y, width, height);
};

const DRAW_MAP: Record<string, DrawFn> = {
  text: drawText,
  circle: drawCircle,
  rect: drawRect,
  line: drawLine,
  path: drawPath,
  image: drawImage,
};

export class Renderer {
  cfg: RendererConfig;
  #renderer: IGraphicsRenderer;
  viewMatrix: mat2d = mat2d.create();

  constructor(cfg: Partial<RendererConfig>) {
    this.cfg = defaultsDeep(cfg, [DEFAULT_CONFIG]) as RendererConfig;
    this.#renderer = this.#createRenderer();
    this.#computeViewMatrix();
  }

  #createRenderer(): IGraphicsRenderer {
    const {width, height, renderer} = this.cfg;
    if (renderer && typeof renderer === 'object') return renderer;
    return renderer === 'svg' ? new SvgRenderer({width, height}) : new CanvasRenderer({width, height});
  }

  #computeViewMatrix() {
    const {width, height} = this.cfg;
    const [x, y, w, h] = this.cfg.viewport ?? [0, 0, width, height];
    // 简化的 2D 正交投影: viewport → canvas 像素坐标
    const sx = width / w;
    const sy = height / h;
    this.viewMatrix = mat2d.fromValues(sx, 0, 0, sy, -x * sx, -y * sy);
  }

  get el() {
    return this.#renderer.el;
  }

  /** 客户端坐标(clientX/Y) → 画布局部坐标 */
  position(point: Point): Point {
    const rect = this.#renderer.el.getBoundingClientRect();
    return [point[0] - rect.left, point[1] - rect.top];
  }

  resize(size: Size) {
    this.#renderer.resize(size);
    this.cfg.width = size.width;
    this.cfg.height = size.height;
    this.#computeViewMatrix();
  }

  /** 绘制渲染队列 */
  draw(queue: Node[]) {
    const r = this.#renderer;
    r.clear();
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      if (!node.renderable()) continue;
      r.save();
      const {attrs} = node;
      if (attrs.gradientOptions) r.gradient(attrs.gradientOptions);
      if (attrs.clipPath) r.clipPath(attrs.clipPath);
      r.setTransform(...(node.worldMatrix as Mat2d));
      r.setAttributes(attrs.values);
      const draw = DRAW_MAP[node.shape.command];
      if (draw) draw(r, node);
      r.restore();
    }
  }

  clear() {
    this.#renderer.clear();
  }

  dispose() {
    this.#renderer.dispose();
  }
}
