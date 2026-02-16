import {mat2d, vec2} from 'gl-matrix';

import {Graphics} from '../core/graphics';

import type {Mat2d, Point} from 'rendx-core';

import type {Node} from './node';
import type {Layer} from './layer';

/** 场景根节点（type=1），管理所有渲染层、提供命中检测和坐标映射 */
export class Scene extends Graphics {
  type: number = 1;
  #queue: Node[] = [];
  #invertWorldMatrix: mat2d | null = null;

  /** 有序层列表（按 layerIndex 排序） */
  layers: Layer[] = [];

  /** 层名称 → Layer 快速查找 */
  #layerMap = new Map<string, Layer>();

  /** 注册一个 Layer（由 App 调用） */
  registerLayer(layer: Layer) {
    this.#layerMap.set(layer.layerName, layer);
    this.layers.push(layer);
    this.layers.sort((a, b) => a.layerIndex - b.layerIndex);
    // Layer 作为 Scene 子节点，继承 worldMatrix
    super.add(layer);
  }

  /** 按名称获取 Layer */
  getLayer(name: string): Layer | undefined {
    return this.#layerMap.get(name);
  }

  /** 移除 Layer（事件层不可移除） */
  removeLayer(name: string) {
    const layer = this.#layerMap.get(name);
    if (!layer || layer.isEventLayer) return;
    this.#layerMap.delete(name);
    this.layers = this.layers.filter(l => l !== layer);
    super.remove(layer);
    layer.dispose();
  }

  /**
   * 默认 add：添加到 default 层（向下兼容）
   * 如果没有 layer，退回原行为（直接加到 Scene children）
   */
  override add(child: Graphics) {
    const defaultLayer = this.#layerMap.get('default');
    if (defaultLayer) {
      defaultLayer.add(child);
    } else {
      super.add(child);
    }
    return this;
  }

  /** 收集所有可渲染节点（type=3），按 ez 排序，带脏标记缓存 */
  getQueue(): Node[] {
    if (this.dirty) {
      const queue: Node[] = [];
      // 如果有分层，从各层收集
      if (this.layers.length > 0) {
        for (const layer of this.layers) {
          if (!layer.isEventLayer) {
            queue.push(...layer.getQueue());
          }
        }
      } else {
        this.traverse((node: Graphics) => {
          if (node.type === 3) queue.push(node as Node);
        });
      }
      queue.sort((a, b) => a.ez - b.ez);
      // 只清自身缓存标记，不向下传播（避免清除子层的渲染脏标记）
      this.dirty = false;
      this.#queue = queue;
    }
    return this.#queue;
  }

  /** 跨层命中检测：从最高层向下搜索 */
  pick(point: Point): Node | undefined {
    if (this.layers.length > 0) {
      // 从最高 layerIndex 往下遍历
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const layer = this.layers[i];
        if (layer.isEventLayer) continue;
        const queue = layer.getQueue();
        for (let j = queue.length - 1; j >= 0; j--) {
          const node = queue[j];
          if (node.hit(point)) return node;
        }
      }
      return undefined;
    }
    // 无分层退回原行为
    for (let i = this.#queue.length - 1; i >= 0; i--) {
      const node = this.#queue[i];
      if (node.hit(point)) return node;
    }
    return undefined;
  }

  /**
   * 屏幕坐标 → 场景坐标（通过逆 worldMatrix 变换，缓存逆矩阵）
   * @param point - 画布像素坐标 [x, y]
   */
  position(point: Point): Point {
    if (!this.#invertWorldMatrix) this.#invertWorldMatrix = mat2d.invert(mat2d.create(), this.worldMatrix)!;
    return vec2.transformMat2d(vec2.create(), point, this.#invertWorldMatrix) as Point;
  }

  /**
   * 更新 Scene 自身的 local/world matrix，并清除逆矩阵缓存。
   * 由 App.render() / App.#frame() 在每帧渲染前调用。
   */
  override updateMatrix() {
    super.updateMatrix();
    this.#invertWorldMatrix = null;
  }

  override setMatrix(matrix: Mat2d, needUpdate?: boolean) {
    this.#invertWorldMatrix = null;
    return super.setMatrix(matrix, needUpdate);
  }
}
