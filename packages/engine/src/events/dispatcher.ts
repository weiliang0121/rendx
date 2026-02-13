import {SimulatedEvent} from './event';

import type {Graphics} from '../core';

const POINTERENTER = ['capture-pointerenter', 'pointerenter'];
const POINTERLEAVE = ['capture-pointerleave', 'pointerleave'];
const POINTEROVER = ['capture-pointerover', 'pointerover'];
const POINTEROUT = ['capture-pointerout', 'pointerout'];

export class EventDispatcher {
  last: SimulatedEvent | null = null;
  eventMap: Record<string, (event: SimulatedEvent) => void> = {};

  constructor() {
    this.eventMap = Object.fromEntries([
      ['click', this.normal],
      ['pointerenter', this.onPointerEnter],
      ['pointerleave', this.onPointerLeave],
      ['pointerover', this.onPointerOver],
      ['pointerout', this.onPointerOut],
      ['pointerdown', this.normal],
      ['pointermove', this.normal],
      ['pointerup', this.normal],
      ['pointercancel', this.normal],
    ]);
  }

  exec(event: SimulatedEvent, node: Graphics) {
    if (node === event.target && event.eventPhase !== 2) return;
    const evt = event.copy();
    evt.currentTarget = node;
    const handler = this.eventMap[evt.type];
    if (handler) handler.bind(this)(evt);
    else this.normal(evt);
  }

  capture(event: SimulatedEvent) {
    event.eventPhase = 1;
    const path = event.composedPath();
    for (let i = path.length - 1; i >= 0; i--) this.exec(event, path[i]);
  }

  target(event: SimulatedEvent) {
    event.eventPhase = 2;
    this.exec(event, event.target);
  }

  bubble(event: SimulatedEvent) {
    event.eventPhase = 3;
    if (!event.bubbles) return;
    const path = event.composedPath();
    for (let i = 0; i < path.length; i++) this.exec(event, path[i]);
  }

  flow(event: SimulatedEvent) {
    this.capture(event);
    this.target(event);
    this.bubble(event);
  }

  process(event: SimulatedEvent) {
    this.simulateOut(event);
    this.simulateLeave(event);
    this.simulateOver(event);
    this.simulateEnter(event);
    this.flow(event);
    this.last = event;
  }

  simulateEnter(event: SimulatedEvent) {
    if (event.type !== 'pointermove') return;
    const {target, nativeEvent} = event;
    const evt = new SimulatedEvent('pointerenter', target, nativeEvent);
    evt.stopPropagation();
    evt.truth = false;
    this.flow(evt);
  }

  simulateLeave(event: SimulatedEvent) {
    if (event.type !== 'pointermove') return;
    const {target: last} = this.last || {};
    const {target: hit} = event;
    if (last && !hit.equals(last)) {
      const evt = new SimulatedEvent('pointerleave', last, event.nativeEvent);
      evt.stopPropagation();
      evt.truth = false;
      this.flow(evt);
    }
  }

  simulateOver(event: SimulatedEvent) {
    if (event.type !== 'pointermove') return;
    const {target, nativeEvent} = event;
    const evt = new SimulatedEvent('pointerover', target, nativeEvent);
    evt.truth = false;
    this.flow(evt);
  }

  simulateOut(event: SimulatedEvent) {
    if (event.type !== 'pointermove') return;
    const {target: last} = this.last || {};
    const {target: hit} = event;
    if (last && !hit.equals(last)) {
      const evt = new SimulatedEvent('pointerout', last, event.nativeEvent);
      evt.truth = false;
      this.flow(evt);
    }
  }

  normal(event: SimulatedEvent) {
    const {type, captureType, eventPhase, currentTarget} = event;
    const name = eventPhase === 1 ? captureType : type;
    if (currentTarget.hasEvent(name)) currentTarget.emit(name, event);
  }

  onPointerEnter(event: SimulatedEvent) {
    const [t0, t1] = POINTERENTER;
    const {eventPhase, currentTarget: cur} = event;
    const name = eventPhase === 1 ? t0 : t1;
    if (cur.hasEvent(name)) {
      const {target: last} = this.last || {};
      const {target: hit} = event;
      if ((!last || !hit.equals(last)) && hit.equals(cur)) {
        cur.emit(name, event);
      }
    }
  }

  onPointerLeave(event: SimulatedEvent) {
    const [t0, t1] = POINTERLEAVE;
    const {eventPhase, currentTarget: cur} = event;
    const name = eventPhase === 1 ? t0 : t1;
    if (cur.hasEvent(name)) {
      const {target: hit} = event;
      if (hit.equals(cur)) {
        cur.emit(name, event);
      }
    }
  }

  onPointerOver(event: SimulatedEvent) {
    const [t0, t1] = POINTEROVER;
    const {eventPhase, currentTarget: cur} = event;
    const name = eventPhase === 1 ? t0 : t1;
    if (cur.hasEvent(name)) {
      const {target: last} = this.last || {};
      const {target: hit} = event;
      if ((!last || !last.equals(hit)) && hit.source(cur)) {
        cur.emit(name, event);
      }
    }
  }

  onPointerOut(event: SimulatedEvent) {
    const [t0, t1] = POINTEROUT;
    const {eventPhase, currentTarget: cur} = event;
    const name = eventPhase === 1 ? t0 : t1;
    if (cur.hasEvent(name)) {
      const {target: hit} = event;
      if (hit.source(cur)) {
        cur.emit(name, event);
      }
    }
  }

  clear() {
    this.last = null;
  }

  dispose() {
    this.clear();
    this.eventMap = {};
  }
}
