import {Shape} from '../core';

import type {Point} from '@dye/core';

export class TextShape extends Shape {
  command = 'text' as const;

  x: number = 0;
  y: number = 0;
  text: string = '';

  from(text: string, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.text = text;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hit(_point: Point) {
    return false;
  }
}
