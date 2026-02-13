import {createSvgEl, getSvgElByTag, setSVGAttrs, setStyles} from '@dye/dom';
import {createSVGGradient} from '@dye/gradient';

import {r2d} from '@dye/core';

import type {IGraphicsRenderer, ClipPath, GradientOptions, AO, Size} from '@dye/core';

const DEFAULT_SIZE: Size = {width: 300, height: 150};

export class SvgRenderer implements IGraphicsRenderer {
  #size: Size;
  #element: SVGSVGElement;
  #group: SVGGElement;
  #g: SVGGElement;
  #defs: SVGDefsElement;
  #stack: SVGGElement[] = [];
  #attributes: AO = {};

  constructor(size: Size = DEFAULT_SIZE) {
    this.#size = size;
    this.#element = createSvgEl('svg');
    this.#defs = getSvgElByTag(this.#element, 'defs');
    this.#group = getSvgElByTag(this.#element, 'g');
    this.#g = createSvgEl('g');
    setSVGAttrs(this.#element, this.#size);
    setStyles(this.#element, {width: `${this.#size.width}px`, height: `${this.#size.height}px`, userSelect: 'none'});
    setStyles(this.#group, {pointerEvents: 'none'});
    this.#initG();
  }

  get el(): SVGSVGElement {
    return this.#element;
  }

  getSize(): Size {
    return this.#size;
  }

  resize(size: Size) {
    this.#size = size;
    setSVGAttrs(this.#element, this.#size);
    setStyles(this.#element, {width: `${this.#size.width}px`, height: `${this.#size.height}px`});
  }

  dispose(): void {
    this.el.remove();
  }

  #initG() {
    this.#group.appendChild(this.#g);
    this.#stack.push(this.#g);
  }

  clear(): void {
    this.#group.innerHTML = '';
    this.#defs.innerHTML = '';
    this.#g = createSvgEl('g');
    this.#stack = [];
    this.#initG();
  }

  save(createChild?: boolean): void {
    const last = this.#stack[this.#stack.length - 1];
    const g = createSvgEl('g') as SVGGElement;
    if (createChild) last.appendChild(g);
    else last.parentNode?.appendChild(g);
    this.#g = g;
    this.#stack.push(g);
  }

  restore(): void {
    if (this.#stack.length > 1) this.#stack.pop();
    this.#g = this.#stack[this.#stack.length - 1];
  }

  #transform(transform: string): void {
    this.#g.setAttribute('transform', `${this.#g.getAttribute('transform') || ''} ${transform}`);
  }

  #addEl<T extends SVGElement>(tag: string, attributes: AO): T {
    return setSVGAttrs(createSvgEl<T>(tag), {...this.#attributes, ...attributes});
  }

  translate(tx: number, ty: number): void {
    this.#transform(`translate(${tx} ${ty})`);
  }

  rotate(radian: number): void {
    this.#transform(`rotate(${radian * r2d})`);
  }

  scale(sx: number, sy: number): void {
    this.#transform(`scale(${sx} ${sy})`);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.#g.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`);
  }

  setAttributes(attrs: AO): void {
    this.#attributes = attrs;
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.#g.appendChild(this.#addEl<SVGRectElement>('rect', {x, y, width, height}));
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    this.#g.appendChild(this.#addEl<SVGLineElement>('line', {x1, y1, x2, y2}));
  }

  circle(x: number, y: number, radius: number): void {
    this.#g.appendChild(this.#addEl<SVGCircleElement>('circle', {cx: x, cy: y, r: radius}));
  }

  text(text: string, x: number, y: number): void {
    const textElement = this.#addEl<SVGTextElement>('text', {x, y});
    textElement.textContent = text;
    this.#g.appendChild(textElement);
  }

  path(path: string): void {
    this.#g.appendChild(this.#addEl<SVGPathElement>('path', {d: path}));
  }

  image(source: CanvasImageSource | string, x: number, y: number, width: number, height: number): void {
    const href = typeof source === 'string' ? source : (source as HTMLImageElement).src ?? '';
    const el = this.#addEl<SVGImageElement>('image', {href, x, y, width, height});
    el.setAttribute('preserveAspectRatio', 'none');
    this.#g.appendChild(el);
  }

  clipPath(clipPath: ClipPath): void {
    const el = createSvgEl<SVGClipPathElement>('clipPath');
    el.setAttribute('id', clipPath.id);
    const pathEl = createSvgEl<SVGPathElement>('path');
    pathEl.setAttribute('d', clipPath.path);
    el.appendChild(pathEl);
    this.#defs.appendChild(el);
  }

  gradient(options: GradientOptions): void {
    const gradient = createSVGGradient(options);
    if (gradient) this.#defs.appendChild(gradient);
  }
}
