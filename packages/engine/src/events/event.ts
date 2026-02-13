import type {Graphics} from '../core';

export class SimulatedEvent {
  type: string;
  target: Graphics;
  currentTarget: Graphics;
  nativeEvent: Event;
  eventPhase: number = 0;
  bubbles: boolean = true;
  timestamp = Date.now();
  offsetX: number = 0;
  offsetY: number = 0;
  worldX: number = 0;
  worldY: number = 0;

  truth: boolean = true;

  #path: Graphics[] | null = null;

  constructor(type: string, target: Graphics, nativeEvent: Event) {
    this.type = type;
    this.target = target;
    this.currentTarget = target;
    this.nativeEvent = nativeEvent;
  }

  get captureType() {
    return `capture-${this.type}`;
  }

  stopPropagation() {
    this.bubbles = false;
  }

  /** 返回从 target 到 root 的路径（缓存） */
  composedPath(): Graphics[] {
    if (!this.#path) this.#path = this.target.path().reverse();
    return this.#path;
  }

  copy() {
    const event = new SimulatedEvent(this.type, this.target, this.nativeEvent);
    event.currentTarget = this.currentTarget;
    event.eventPhase = this.eventPhase;
    event.bubbles = this.bubbles;
    event.timestamp = this.timestamp;
    event.offsetX = this.offsetX;
    event.offsetY = this.offsetY;
    event.worldX = this.worldX;
    event.worldY = this.worldY;
    event.#path = this.#path;
    return event;
  }
}
