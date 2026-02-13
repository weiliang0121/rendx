import {Shape} from '../core';

export class PathShape extends Shape {
  command = 'path' as const;

  from(d: string) {
    this.d = d;
    this.p = null;
  }
}
