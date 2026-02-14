/**
 * 基础元素渲染器工具集。
 *
 * 提供 rect、circle、round 三种简单渲染器。
 * 不再自动注册为内置类型，用户按需导入并手动注册：
 *
 * ```ts
 * import { rectRenderer } from 'rendx-element-plugin';
 * element.registerType('rect', rectRenderer);
 * ```
 */

import {Node, Group} from 'rendx-engine';

import type {ElementRenderer} from './types';

/** 创建标签 Node（居中显示） */
function createLabel(text: string, cx: number, cy: number): Node {
  const label = Node.create('text', {
    fill: '#333333',
    fontSize: 14,
    textAlign: 'center',
    textBaseline: 'middle',
  });
  label.shape.from(text, cx, cy);
  label.name = '__label__';
  return label;
}

/** 矩形元素渲染器 */
export const rectRenderer: ElementRenderer = data => {
  const group = new Group();
  const w = data.width ?? 100;
  const h = data.height ?? 60;

  const body = Node.create('rect', {
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 1,
    ...data.style,
  });
  body.shape.from(0, 0, w, h);
  body.name = '__body__';
  group.add(body);

  if (data.label) {
    group.add(createLabel(data.label, w / 2, h / 2));
  }

  return group;
};

/** 圆形元素渲染器 */
export const circleRenderer: ElementRenderer = data => {
  const group = new Group();
  const r = Math.min(data.width ?? 60, data.height ?? 60) / 2;

  const body = Node.create('circle', {
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 1,
    ...data.style,
  });
  body.shape.from(r, r, r);
  body.name = '__body__';
  group.add(body);

  if (data.label) {
    group.add(createLabel(data.label, r, r));
  }

  return group;
};

/** 圆角矩形元素渲染器 */
export const roundRenderer: ElementRenderer = data => {
  const group = new Group();
  const w = data.width ?? 100;
  const h = data.height ?? 60;

  const body = Node.create('round', {
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 1,
    ...data.style,
  });
  body.shape.from(0, 0, w, h);
  body.shape.options(6, 6);
  body.name = '__body__';
  group.add(body);

  if (data.label) {
    group.add(createLabel(data.label, w / 2, h / 2));
  }

  return group;
};
