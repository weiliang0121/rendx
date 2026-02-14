import {BoundingBox} from 'rendx-bounding';

import {Shape} from '../core';
import {imageLoader} from '../core/image-loader';

import type {Point} from 'rendx-core';

type ImageSource = HTMLImageElement | ImageBitmap;

export class ImageShape extends Shape {
  command = 'image' as const;

  src: string = '';
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  source: ImageSource | null = null;

  from(src: string, x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    if (src !== this.src) {
      this.src = src;
      this.source = imageLoader.load(src, () => {
        this.source = imageLoader.get(src);
        this.needUpdate = true;
      });
    }

    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  /** 直接传入已加载的图片对象（跳过 loader） */
  fromElement(el: ImageSource, x: number, y: number, width: number, height: number) {
    this.source = el;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    if (this.autoNeedUpdate) this.needUpdate = true;
    return this;
  }

  hit(point: Point) {
    const [px, py] = point;
    const {x, y, width, height} = this;
    return x <= px && px <= x + width && y <= py && py <= y + height;
  }

  box() {
    const {x, y, width, height} = this;
    this.boundingBox = BoundingBox.fromRect(x, y, width, height);
    return this.boundingBox;
  }
}
