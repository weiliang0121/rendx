import {isNone, isNil, isStr, isNum} from '@dye/core';
import {convertFontOptionsToCSS} from '@dye/dom';
import {createCanvasGradient} from '@dye/gradient';

import type {FontOptions} from '@dye/dom';
import type {ClipPath, GradientOptions, AO} from '@dye/core';

export type Gradients = Map<string, GradientOptions>;
export type ClipPaths = Map<string, ClipPath>;

export interface FillOrStrokeTarget {
  path?: Path2D;
  x?: number;
  y?: number;
  text?: string;
}

const getRef = (url: string) => {
  const match = url?.match(/url\(#(.*)\)/);
  return match ? match[1] : '';
};

/**
 * 设置 Canvas 的全局合成操作
 * @param ctx CanvasRenderingContext2D 上下文
 * @param attrs 属性对象
 */
const setCompositeOperation = (ctx: CanvasRenderingContext2D, attrs: AO): void => {
  const {globalCompositeOperation: gco} = attrs;
  if (isStr(gco)) ctx.globalCompositeOperation = gco as GlobalCompositeOperation;
};

/**
 * 检查是否需要更新填充或描边
 * @param value 填充或描边值
 * @returns 是否需要更新
 */
const shouldUpdateFillOrStroke = (value: string | number | undefined): boolean => !isNil(value) && !isNone(value) && isStr(value);

/**
 * 设置 Canvas 的样式（填充或描边）
 * @param ctx CanvasRenderingContext2D 上下文
 * @param style 样式颜色或渐变 ID
 * @param gradients 渐变对象
 * @param isFill 是否为填充样式
 */
const setStyle = (ctx: CanvasRenderingContext2D, style: string, gradients: Gradients, isFill: boolean): void => {
  const id = getRef(style);
  if (id && !gradients.has(id)) return;
  const styleValue = id ? createCanvasGradient(ctx, gradients.get(id)!)! : style;
  if (isFill) ctx.fillStyle = styleValue;
  else ctx.strokeStyle = styleValue;
};

/**
 * 设置全局透明度
 * @param ctx CanvasRenderingContext2D 上下文
 * @param fillOrStrokeOpacity 填充或描边透明度
 * @param opacity 全局透明度
 */
const setGlobalAlpha = (ctx: CanvasRenderingContext2D, fillOrStrokeOpacity: number | undefined, opacity: number | undefined): void => {
  ctx.globalAlpha = fillOrStrokeOpacity ?? opacity ?? 1;
};

/**
 * 设置描边属性
 * @param ctx CanvasRenderingContext2D 上下文
 * @param attrs 属性对象
 */
let _dashCache: {key: string; dash: number[]} | null = null;

const setStrokeAttributes = (ctx: CanvasRenderingContext2D, attrs: AO): void => {
  const {strokeWidth, strokeLinecap, strokeLinejoin, strokeMiterlimit, strokeDasharray, strokeDashoffset} = attrs;
  if (isNum(strokeWidth)) ctx.lineWidth = strokeWidth;
  if (isStr(strokeLinecap)) ctx.lineCap = strokeLinecap as CanvasLineCap;
  if (isStr(strokeLinejoin)) ctx.lineJoin = strokeLinejoin as CanvasLineJoin;
  if (isNum(strokeMiterlimit)) ctx.miterLimit = strokeMiterlimit;
  if (isNum(strokeDashoffset)) ctx.lineDashOffset = strokeDashoffset;
  if (isStr(strokeDasharray)) {
    if (!_dashCache || _dashCache.key !== strokeDasharray) {
      _dashCache = {key: strokeDasharray, dash: strokeDasharray.split(',').map((x: string) => Number(x.trim()))};
    }
    ctx.setLineDash(_dashCache.dash);
  }
};

/**
 * 设置填充或描边
 * @param ctx CanvasRenderingContext2D 上下文
 * @param gradients 渐变对象
 * @param isFill 是否为填充样式
 * @param attrs 属性对象
 * @returns 是否成功设置填充或描边
 */
const setFillOrStroke = (ctx: CanvasRenderingContext2D, gradients: Gradients, isFill: boolean, attrs: AO): boolean => {
  const {fill, stroke, fillOpacity, strokeOpacity, opacity} = attrs;
  const value = isFill ? fill : stroke;
  const opacityValue = isFill ? fillOpacity : strokeOpacity;
  // tips: 如果填充或描边值为 none 或者 undefined，则不进行绘制
  // 但是 canvas 或者 svg 中 fill 和 stroke 属性可以为 none，表示不填充或描边
  // 且如果 fill 和 stroke 属性不通过则都不会进行绘制，这与canvas画布有默认fillStyle和strokeStyle不同
  if (!shouldUpdateFillOrStroke(value)) return false;
  setStyle(ctx, value as string, gradients, isFill);
  setGlobalAlpha(ctx, opacityValue, opacity);
  setCompositeOperation(ctx, attrs);
  if (!isFill) setStrokeAttributes(ctx, attrs);
  return true;
};

const TEXT_ALIGN_MAP: Record<string, CanvasTextAlign> = {
  start: 'left',
  middle: 'center',
  end: 'right',
};

const DOMINANT_BASELINE_MAP: Record<string, CanvasTextBaseline> = {
  auto: 'alphabetic',
  'text-bottom': 'alphabetic',
  alphabetic: 'alphabetic',
  ideographic: 'ideographic',
  middle: 'middle',
  central: 'middle',
  mathematical: 'hanging',
  hanging: 'hanging',
  'text-top': 'alphabetic',
};

/**
 * 设置字体样式
 * @param ctx CanvasRenderingContext2D 上下文
 * @param attrs 属性对象
 */
let _fontCache: {key: string; css: string} | null = null;

const setFont = (ctx: CanvasRenderingContext2D, attrs: AO) => {
  const {fontFamily, fontSize, fontStyle, fontWeight, textAnchor, dominantBaseline} = attrs;
  const fontKey = `${fontStyle}|${fontWeight}|${fontSize}|${fontFamily}`;
  if (!_fontCache || _fontCache.key !== fontKey) {
    const fontOpts: Partial<FontOptions> = {fontFamily, fontSize, fontStyle, fontWeight};
    _fontCache = {key: fontKey, css: convertFontOptionsToCSS(fontOpts)};
  }
  ctx.font = _fontCache.css;
  if (isStr(textAnchor)) ctx.textAlign = TEXT_ALIGN_MAP[textAnchor];
  if (isStr(dominantBaseline)) ctx.textBaseline = DOMINANT_BASELINE_MAP[dominantBaseline];
};

/** 绘制执行器 —— 将 fill/stroke 的方法选择抽象为静态对象 */
interface DrawOps {
  shape(ctx: CanvasRenderingContext2D): void;
  path(ctx: CanvasRenderingContext2D, path: Path2D): void;
  text(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void;
}

const FILL_OPS: DrawOps = {
  shape: ctx => ctx.fill(),
  path: (ctx, path) => ctx.fill(path),
  text: (ctx, text, x, y) => ctx.fillText(text, x, y),
};

const STROKE_OPS: DrawOps = {
  shape: ctx => ctx.stroke(),
  path: (ctx, path) => ctx.stroke(path),
  text: (ctx, text, x, y) => ctx.strokeText(text, x, y),
};

/**
 * 绘制填充或描边
 * @param ctx CanvasRenderingContext2D 上下文
 * @param target 填充或描边目标
 * @param isFill 是否为填充
 * @param attrs 属性对象
 * @param gradients 渐变对象
 */
const draw = (ctx: CanvasRenderingContext2D, target: FillOrStrokeTarget, isFill: boolean, attrs: AO, gradients: Gradients) => {
  if (!setFillOrStroke(ctx, gradients, isFill, attrs)) return;
  const ops = isFill ? FILL_OPS : STROKE_OPS;

  if (target.path) return ops.path(ctx, target.path);
  if (!isNil(target.text)) {
    setFont(ctx, attrs);
    return ops.text(ctx, target.text, target.x ?? 0, target.y ?? 0);
  }
  ops.shape(ctx);
};

/**
 * 填充或描边目标
 * @param ctx CanvasRenderingContext2D 上下文
 * @param target 填充或描边目标
 * @param gradients 渐变对象
 * @param attrs 属性对象
 */
export const fillAndStrokeTarget = (ctx: CanvasRenderingContext2D, target: FillOrStrokeTarget, gradients: Gradients, attrs: AO) => {
  draw(ctx, target, true, attrs, gradients); // Fill
  draw(ctx, target, false, attrs, gradients); // Stroke
};

/**
 * 剪裁
 * @param ctx CanvasRenderingContext2D 上下文
 * @param clipPaths 剪裁路径
 * @param attrs 属性对象
 */
export const clip = (ctx: CanvasRenderingContext2D, clipPaths: ClipPaths, attrs: AO): void => {
  const clipPath = attrs.clipPath as string;
  if (!clipPath) return;

  const id = getRef(clipPath);
  if (id && clipPaths.has(id)) {
    const clipPath = clipPaths.get(id);
    if (clipPath) ctx.clip(new Path2D(clipPath.path));
  }
};
