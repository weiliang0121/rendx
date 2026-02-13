import {setAttrs, setStyles, createCanvasEl} from '@dye/dom';

import {fillAndStrokeTarget, clip} from './attributes';

import type {IGraphicsRenderer, ClipPath, GradientOptions, AO, GF, Size} from '@dye/core';

import type {Gradients, ClipPaths} from './attributes';

const DEFAULT_SIZE: Size = {width: 300, height: 150};

export class CanvasRenderer implements IGraphicsRenderer {
  #size: Size;
  #ratio: number;
  #actualSize: Size;
  #element: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #attributes: AO = {};
  #clipPaths: ClipPaths = new Map();
  #gradients: Gradients = new Map();

  constructor(size: Size = DEFAULT_SIZE) {
    const {width, height} = size;
    this.#size = size;
    this.#ratio = window.devicePixelRatio || 1;
    this.#actualSize = {width: width * this.#ratio, height: height * this.#ratio};

    this.#element = createCanvasEl();
    setAttrs(this.#element, this.#actualSize);
    setStyles(this.#element, {width: `${width}px`, height: `${height}px`});

    const ctx = this.#element.getContext('2d');
    if (!ctx) throw new Error('CanvasRenderingContext2D is not defined');
    ctx.scale(this.#ratio, this.#ratio);
    ctx.save();
    this.#ctx = ctx;
  }

  get el(): HTMLCanvasElement {
    return this.#element;
  }

  getSize(): Size {
    return this.#size;
  }

  resize(size: Size) {
    const {width, height} = size;
    this.#size = size;
    this.#actualSize = {width: width * this.#ratio, height: height * this.#ratio};
    setAttrs(this.#element, this.#actualSize);
    setStyles(this.#element, {width: `${width}px`, height: `${height}px`});
    this.#ctx.restore();
    this.#ctx.save();
    this.#ctx.scale(this.#ratio, this.#ratio);
  }

  dispose(): void {
    this.el.remove();
  }

  clear(): void {
    const {width, height} = this.#actualSize;
    this.#ctx.clearRect(0, 0, width, height);
  }

  save(): void {
    this.#ctx.save();
  }

  restore(): void {
    this.#ctx.restore();
  }

  translate(tx: number, ty: number): void {
    this.#ctx.translate(tx, ty);
  }

  rotate(radian: number): void {
    this.#ctx.rotate(radian);
  }

  scale(sx: number, sy: number): void {
    this.#ctx.scale(sx, sy);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.#ctx.transform(a, b, c, d, e, f);
  }

  setAttributes(attributes: AO): void {
    this.#attributes = attributes;
  }

  #clip() {
    clip(this.#ctx, this.#clipPaths, this.#attributes);
  }

  #draw(fn: GF, closePath: boolean = true) {
    this.#clip();
    this.#ctx.beginPath();
    fn();
    if (closePath) this.#ctx.closePath();
    fillAndStrokeTarget(this.#ctx, {}, this.#gradients, this.#attributes);
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.#draw(() => this.#ctx.rect(x, y, width, height));
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    this.#draw(() => {
      this.#ctx.moveTo(x1, y1);
      this.#ctx.lineTo(x2, y2);
    }, false);
  }

  circle(x: number, y: number, radius: number): void {
    this.#draw(() => this.#ctx.arc(x, y, radius, 0, 2 * Math.PI));
  }

  text(text: string, x: number, y: number): void {
    clip(this.#ctx, this.#clipPaths, this.#attributes);
    fillAndStrokeTarget(this.#ctx, {text, x, y}, this.#gradients, this.#attributes);
  }

  path(path: string): void {
    clip(this.#ctx, this.#clipPaths, this.#attributes);
    fillAndStrokeTarget(this.#ctx, {path: new Path2D(path)}, this.#gradients, this.#attributes);
  }

  image(source: CanvasImageSource | string, x: number, y: number, width: number, height: number): void {
    if (typeof source === 'string') return;
    clip(this.#ctx, this.#clipPaths, this.#attributes);
    this.#ctx.drawImage(source, x, y, width, height);
  }

  clipPath(clipPath: ClipPath): void {
    this.#clipPaths.set(clipPath.id, clipPath);
  }

  gradient(options: GradientOptions): void {
    this.#gradients.set(options.id, options);
  }
}
