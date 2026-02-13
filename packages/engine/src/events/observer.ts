import {SimulatedEvent} from './event';
import {EventDispatcher} from './dispatcher';

import type {Renderer} from '../renderers';
import type {Scene} from '../scene';

/**
 * 每个特性真正需要监听的原生 DOM 事件
 * move: 只监听 pointermove，enter/leave/over/out 由 EventDispatcher 从 pointermove 模拟
 */
const FEAT_NATIVE_EVENTS: Record<string, string[]> = {
  move: ['pointermove'],
  click: ['pointerdown', 'pointerup', 'click'],
  wheel: ['wheel'],
};

/** passive 适用的原生事件 */
const PASSIVE_EVENTS = new Set(['pointermove', 'wheel']);

export class EventObserver {
  feats: Record<string, boolean> = {move: true, click: true, wheel: true};
  scene: Scene;
  renderer: Renderer;
  dispatcher = new EventDispatcher();
  #bound = false;
  #cleanups: (() => void)[] = [];

  constructor(scene: Scene, renderer: Renderer) {
    this.scene = scene;
    this.renderer = renderer;
  }

  #createListener(type: string) {
    return (evt: Event) => {
      const {clientX, clientY} = evt as PointerEvent;
      const offset = this.renderer.position([clientX, clientY]);
      const world = this.scene.position(offset);
      const target = this.scene.pick(offset) || this.scene;
      target.setDispatcher(this.dispatcher);
      const event = new SimulatedEvent(type, target, evt);
      event.offsetX = offset[0];
      event.offsetY = offset[1];
      event.worldX = world[0];
      event.worldY = world[1];
      target.dispatchEvent(event);
    };
  }

  /** 幂等绑定：每种原生事件只注册一次 */
  bindEvents() {
    if (this.#bound) return;
    this.#bound = true;

    const el = this.renderer.el;
    // 收集去重后的原生事件类型
    const nativeTypes = new Set<string>();
    for (const [feat, enabled] of Object.entries(this.feats)) {
      if (!enabled) continue;
      for (const type of FEAT_NATIVE_EVENTS[feat]) {
        nativeTypes.add(type);
      }
    }

    // 每个原生事件 → 同类型 SimulatedEvent → dispatcher.process() 负责模拟衍生事件
    for (const nativeType of nativeTypes) {
      const listener = this.#createListener(nativeType);
      const passive = PASSIVE_EVENTS.has(nativeType);
      const options: AddEventListenerOptions | undefined = passive ? {passive: true} : undefined;
      el.addEventListener(nativeType, listener, options);
      this.#cleanups.push(() => el.removeEventListener(nativeType, listener, options as EventListenerOptions));
    }
  }

  unbindEvents() {
    for (const fn of this.#cleanups) fn();
    this.#cleanups = [];
    this.#bound = false;
  }

  dispose() {
    this.unbindEvents();
    this.dispatcher.dispose();
  }
}
