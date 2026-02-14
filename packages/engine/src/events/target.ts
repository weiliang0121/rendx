import EventEmitter from 'eventemitter3';

import {isStr} from 'rendx-core';

import type {SimulatedEvent} from './event';
import type {EventDispatcher} from './dispatcher';

export interface EventListenerOptions {
  once?: boolean;
  capture?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventListener = (...args: any[]) => void;

export class EventTarget {
  #emitter: EventEmitter | null = null;
  dispatcher: EventDispatcher | null = null;

  #getEmitter(): EventEmitter {
    if (!this.#emitter) this.#emitter = new EventEmitter();
    return this.#emitter;
  }

  setDispatcher(dispatcher: EventDispatcher) {
    this.dispatcher = dispatcher;
  }

  on(event: string, listener: EventListener, options?: EventListenerOptions) {
    const {once = false, capture} = options || {};
    if (capture) event = `capture-${event}`;
    const emitter = this.#getEmitter();
    if (once) emitter.once(event, listener);
    else emitter.on(event, listener);
  }

  off(event: string, listener: EventListener, options?: EventListenerOptions) {
    if (!this.#emitter) return;
    const {capture} = options || {};
    if (capture) event = `capture-${event}`;
    this.#emitter.off(event, listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, payload?: any) {
    if (!this.#emitter) return;
    this.#emitter.emit(event, payload);
  }

  eventNames() {
    return this.#emitter ? this.#emitter.eventNames() : [];
  }

  eventTypes() {
    return (this.eventNames().filter(name => isStr(name)) as string[]).map(name => {
      return name.startsWith('capture-') ? name.slice(8) : name;
    });
  }

  listeners(event: string) {
    return this.#emitter ? this.#emitter.listeners(event) : [];
  }

  hasEvent(event: string) {
    return this.#emitter ? this.#emitter.listenerCount(event) > 0 : false;
  }

  dispatchEvent(evt: SimulatedEvent) {
    this.dispatcher?.process(evt);
  }
}
