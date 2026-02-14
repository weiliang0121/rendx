import type {AO, Size} from 'rendx-core';

/**
 * 设置元素属性
 * @param el HTMLElement | SVGElement 元素
 * @param attributes AO 通用对象类型
 * @returns HTMLElement | SVGElement 元素
 */
export const setAttrs = <T extends HTMLElement | SVGElement>(el: T, attributes: AO): T => {
  if (!attributes) return el;
  const entries = Object.entries(attributes);
  const len = entries.length;
  for (let i = 0; i < len; i += 1) {
    const [key, value] = entries[i];
    if (value == null) el.removeAttribute(key);
    else el.setAttribute(key, `${value}`);
  }
  return el;
};

/**
 * 设置元素样式
 * @param el HTMLElement | SVGElement 元素
 * @param styles AO 通用对象类型
 * @returns HTMLElement | SVGElement 元素
 */
export const setStyles = <T extends HTMLElement | SVGElement>(el: T, styles: AO): T => {
  if (!styles) return el;
  const entries = Object.entries(styles);
  const len = entries.length;
  for (let i = 0; i < len; i += 1) {
    const [key, value] = entries[i];
    const k = camelToKebab(key);
    if (value == null) el.style.removeProperty(k);
    else el.style.setProperty(k, `${value}`);
  }
  return el;
};

/**
 * 获取元素的宽高
 * @param el HTMLElement | SVGElement 元素
 * @returns {width: number, height: number} 元素的宽高
 */
export const getSize = <T extends HTMLElement | SVGElement>(el: T): Size => {
  const {clientHeight, clientWidth} = el;
  return {width: clientWidth, height: clientHeight} as Size;
};

/**
 * 检查 document 是否存在
 */
export const checkDocument = () => {
  if (!document) throw new Error('document missing!');
};

/**
 * 创建 SVG 元素
 * @param type SVG 标签名
 * @returns SVGElement
 */
export const createSvgEl = <T extends SVGElement>(type: string): T => {
  checkDocument();
  return document.createElementNS('http://www.w3.org/2000/svg', type) as T;
};

/**
 * 创建 Canvas 元素
 * @returns HTMLCanvasElement
 */
export const createCanvasEl = (): HTMLCanvasElement => {
  checkDocument();
  return document.createElement('canvas');
};

/**
 * 创建并附加 SVG 元素
 * @param el 父 SVG 元素
 * @param tag SVG 标签名
 * @returns 新创建的 SVG 元素
 */
const createAndAppendSvgEl = <T extends SVGElement>(el: SVGElement, tag: string): T => {
  const element = createSvgEl<T>(tag);
  el.appendChild(element as Node);
  return element;
};

/**
 * 获取或创建 SVG 子元素
 * @param el 父 SVG 元素
 * @param tag SVG 标签名
 * @returns 匹配的或新创建的 SVG 子元素
 */
export const getSvgElByTag = <T extends SVGElement>(el: SVGElement, tag: string): T => {
  const elements = el.getElementsByTagNameNS('http://www.w3.org/2000/svg', tag);
  return elements.length > 0 ? (elements[0] as T) : createAndAppendSvgEl<T>(el, tag);
};

const WHITE_LIST = new Set([
  'preserveAspectRatio',
  'clipPathUnits',
  'patternContentUnits',
  'patternUnits',
  'maskContentUnits',
  'maskUnits',
  'primitiveUnits',
  'filterUnits',
  'gradientTransform',
  'gradientUnits',
  'spreadMethod',
  'markerUnits',
  'markerWidth',
  'markerHeight',
  'refX',
  'refY',
  'viewTarget',
]);

/**
 * 将驼峰命名法转换为短横线命名法
 * @param camelCase 驼峰命名法字符串
 * @returns 短横线命名法字符串
 */
export function camelToKebab(camelCase: string): string {
  return camelCase.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 转换 SVG 属性名
 * @param camelCase 驼峰命名法属性名
 * @returns 转换后的属性名
 */
export function convertSVGAttrs(camelCase: string): string {
  return WHITE_LIST.has(camelCase) ? camelCase : camelToKebab(camelCase);
}

/**
 * 将属性应用到 SVG 元素上
 * @param el SVG 元素
 * @param attributes 属性对象
 */
export function setSVGAttrs<T extends SVGElement>(el: T, attributes: AO): T {
  const convertedAttributes = Object.fromEntries(Object.entries(attributes).map(([key, value]) => [convertSVGAttrs(key), value]));
  return setAttrs(el, convertedAttributes);
}
