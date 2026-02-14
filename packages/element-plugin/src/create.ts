/**
 * createElement — 元素类型工厂。
 *
 * 接受一个 render 函数，返回一个 ElementDef。
 * render 函数在内部使用 engine 原生 API（Node.create / group.add）
 * 构建 Group 子树，框架只管生命周期。
 *
 * @example
 * ```ts
 * const Card = createElement<{ title: string }>((ctx, data) => {
 *   const bg = Node.create('rect', { fill: '#fff' });
 *   bg.shape.from(0, 0, ctx.width, ctx.height);
 *   ctx.group.add(bg);
 *
 *   const label = Node.create('text', { fill: '#333' });
 *   label.shape.from(data.title, ctx.width / 2, ctx.height / 2);
 *   ctx.group.add(label);
 *
 *   ctx.port('in', 'left');
 *   ctx.port('out', 'right');
 * });
 * ```
 */

import type {ElementDef, ElementRenderFn} from './types';

export function createElement<T = Record<string, unknown>>(render: ElementRenderFn<T>): ElementDef<T> {
  return {
    __element_def__: true,
    render,
  };
}
