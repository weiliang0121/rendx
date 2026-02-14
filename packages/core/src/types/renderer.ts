import type {AO} from './base';
import type {GradientOptions} from './gradient';

/** 裁剪路径 */
export interface ClipPath {
  id: string;
  path: string;
}

/**
 * 图形渲染器接口，Canvas2D 和 SVG 各自实现。
 * 统一的渲染 API：save/restore、变换、属性设置、形状绘制、渐变/裁剪。
 */
export interface IGraphicsRenderer {
  /** 渲染器根 DOM 元素 */
  get el(): HTMLCanvasElement | SVGSVGElement;
  getSize(): {width: number; height: number};
  resize(size: {width: number; height: number}): void;
  dispose(): void;
  clear(): void;
  save(createChild?: boolean): void;
  restore(): void;
  translate(tx: number, ty: number): void;
  rotate(radian: number): void;
  scale(sx: number, sy: number): void;
  /** 设置 2x3 仿射变换矩阵 [a, b, c, d, e, f] */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  /** 批量设置视觉属性（fill/stroke/opacity/font 等） */
  setAttributes(attributes: AO): void;
  rect(x: number, y: number, width: number, height: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  circle(x: number, y: number, radius: number): void;
  text(text: string, x: number, y: number): void;
  path(path: string): void;
  image(source: CanvasImageSource | string, x: number, y: number, width: number, height: number): void;
  clipPath(clipPath: ClipPath): void;
  gradient(options: GradientOptions): void;
}
