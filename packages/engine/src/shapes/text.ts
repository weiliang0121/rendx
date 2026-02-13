import {BoundingBox} from '@dye/bounding';

import {Shape} from '../core';

import type {AO, Point} from '@dye/core';

/**
 * 文本测量函数签名。
 * 接收文本内容和节点样式属性（含 fontSize、fontFamily 等），返回本地空间 BoundingBox。
 * 返回 null 表示无法测量。
 */
export type TextMeasureFn = (text: string, attrs: AO) => BoundingBox | null;

export class TextShape extends Shape {
  command = 'text' as const;

  x: number = 0;
  y: number = 0;
  text: string = '';

  /**
   * 全局默认文本测量函数。
   * 使用者通过 `TextShape.defaultMeasure = fn` 注入，
   * 所有 TextShape 实例默认使用此函数（除非实例级覆盖）。
   *
   * @example
   * ```ts
   * import {getTextBoundingBox} from '@dye/dom';
   * TextShape.defaultMeasure = (text, attrs) =>
   *   getTextBoundingBox({fontSize: attrs.fontSize, fontFamily: attrs.fontFamily}, text);
   * ```
   */
  static defaultMeasure: TextMeasureFn | null = null;

  /** 实例级文本测量函数，优先于 `defaultMeasure` */
  measure: TextMeasureFn | null = null;

  /** 当前绑定的属性（Node.update → shape.setAttrs 注入，供测量函数读取字体信息） */
  #attrs: AO = {};

  override setAttrs(attrs: AO) {
    this.#attrs = attrs;
  }

  from(text: string, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.text = text;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    this.box();
    this.needUpdate = false;
  }

  box(): BoundingBox {
    const measureFn = this.measure ?? TextShape.defaultMeasure;
    if (measureFn && this.text) {
      const bb = measureFn(this.text, this.#attrs);
      if (bb) {
        // 测量结果是以 (0,0) 为原点的尺寸，平移到 (x, y)
        this.boundingBox = BoundingBox.fromRect(this.x, this.y - bb.height, bb.width, bb.height);
        return this.boundingBox;
      }
    }
    // 无测量函数或测量失败 → 空包围盒
    return this.boundingBox;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hit(_point: Point) {
    // 有了 bbox 就能做基本的 hit test
    if (this.boundingBox && !this.boundingBox.empty) {
      return this.boundingBox.containsPoint(_point[0], _point[1]);
    }
    return false;
  }
}
