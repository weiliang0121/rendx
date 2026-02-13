import {BoundingBox} from '@dye/bounding';
import {createSymbol} from '@dye/shape';
import {Path} from '@dye/path';

import {Shape} from '../core';

export class SymbolShape extends Shape {
  command = 'path' as const;

  r: number = 1;
  symbol: string = 'circle';

  options(symbol: string) {
    this.symbol = symbol;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  from(r: number) {
    this.r = r;
    if (this.autoNeedUpdate) this.needUpdate = true;
  }

  build() {
    if (!this.needUpdate) return;
    if (!this.creator) this.creator = new Path();
    else this.creator.clear();
    createSymbol(this.creator, this.symbol, {cx: 0, cy: 0, r: this.r});
    this.d = this.creator.toString();
    this.p = null;
    this.box();
    this.needUpdate = false;
  }

  path() {
    return this.d;
  }

  box() {
    const {r} = this;
    this.boundingBox = BoundingBox.fromPoints(-r, -r, r, r);
    return this.boundingBox;
  }
}
