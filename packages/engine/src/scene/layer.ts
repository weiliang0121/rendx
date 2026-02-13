import {Renderer} from '../renderers';
import {Group} from './group';

import type {RendererConfig} from '../renderers/renderer';
import type {Node} from './node';
import type {Graphics} from '../core';

/**
 * Layer — 分层渲染节点
 * 每个 Layer 持有独立 Renderer（独立 Canvas/SVG 元素），实现多 Canvas 分层渲染。
 * Layer 本身是 Group 子类，节点通过 layer.add(node) 挂入层中。
 */
export class Layer extends Group {
  override type: number = 4;

  /** 层名称 */
  layerName: string;

  /** 层级序号（CSS z-index） */
  layerIndex: number;

  /** 独立渲染器 */
  renderer: Renderer;

  /** 是否为内置事件层（不可删除，不渲染内容） */
  isEventLayer: boolean;

  /** 是否启用视口裁剪（默认 true，Text 层等可关闭） */
  culling: boolean;

  #queue: Node[] = [];
  #culledQueue: Node[] = [];

  constructor(name: string, index: number, cfg: Partial<RendererConfig>, isEventLayer = false) {
    super();
    this.layerName = name;
    this.layerIndex = index;
    this.isEventLayer = isEventLayer;
    this.culling = !isEventLayer;
    this.renderer = new Renderer(cfg);

    // 设置 Canvas/SVG 元素的样式
    const el = this.renderer.el;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.zIndex = String(index);

    if (isEventLayer) {
      // 事件层：透明、接收事件
      el.style.background = 'transparent';
    } else {
      // 渲染层：不接收事件
      el.style.pointerEvents = 'none';
    }
  }

  /** 获取当前层的渲染队列（仅 type=3 的 Node） */
  getQueue(): Node[] {
    if (this.dirty) {
      const queue: Node[] = [];
      this.traverse((node: Graphics) => {
        if (node.type === 3) queue.push(node as Node);
      });
      queue.sort((a, b) => a.ez - b.ez);
      this.setDirty(false);
      this.#queue = queue;
    }
    return this.#queue;
  }

  /** 层级是否需要重绘 */
  override sign(): boolean {
    if (this.isEventLayer) return false; // 事件层不渲染
    return super.sign();
  }

  /** 绘制本层 */
  draw() {
    if (this.isEventLayer) return;
    this.update();
    const queue = this.getQueue();
    this.renderer.draw(this.culling ? this.#cullViewport(queue) : queue);
  }

  /**
   * 视口裁剪：过滤掉 worldBBox 完全在画布外的节点，减少 draw call。
   * 没有有效 boundingBox 的节点（如 Text）不会被剔除。
   */
  #cullViewport(queue: Node[]): Node[] {
    const {width, height} = this.renderer.cfg;
    const culled = this.#culledQueue;
    culled.length = 0;

    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      const bb = node.shape.boundingBox;

      // 无有效包围盒的节点无法裁剪，保留
      if (!bb || bb.empty) {
        culled.push(node);
        continue;
      }

      const m = node.worldMatrix;
      const x0 = bb.x, y0 = bb.y, x1 = bb.right, y1 = bb.bottom;

      // 通过 worldMatrix 变换四角点，计算世界空间 AABB
      let wx: number, wy: number;
      let minX: number, maxX: number, minY: number, maxY: number;

      wx = m[0] * x0 + m[2] * y0 + m[4];
      wy = m[1] * x0 + m[3] * y0 + m[5];
      minX = maxX = wx;
      minY = maxY = wy;

      wx = m[0] * x1 + m[2] * y0 + m[4];
      wy = m[1] * x1 + m[3] * y0 + m[5];
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;

      wx = m[0] * x1 + m[2] * y1 + m[4];
      wy = m[1] * x1 + m[3] * y1 + m[5];
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;

      wx = m[0] * x0 + m[2] * y1 + m[4];
      wy = m[1] * x0 + m[3] * y1 + m[5];
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;

      // AABB 与视口 [0, 0, width, height] 相交则保留
      if (maxX > 0 && minX < width && maxY > 0 && minY < height) {
        culled.push(node);
      }
    }
    return culled;
  }

  resize(size: {width: number; height: number}) {
    this.renderer.resize(size);
  }

  override clear() {
    super.clear();
    this.#queue = [];
    this.renderer.clear();
  }

  override dispose() {
    super.dispose();
    this.#queue = [];
    this.renderer.dispose();
  }
}
