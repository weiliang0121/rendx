import {describe, it, expect, vi} from 'vitest';
import {EventTarget} from '../src/events/target';
import {SimulatedEvent} from '../src/events/event';
import {EventDispatcher} from '../src/events/dispatcher';
import {Graphics} from '../src/core/graphics';

describe('EventTarget - 惰性事件发射器', () => {
  it('初始无 emitter 时消费方法安全', () => {
    const target = new EventTarget();
    expect(target.eventNames()).toEqual([]);
    expect(target.listeners('click')).toEqual([]);
    expect(target.hasEvent('click')).toBe(false);
    // emit/off 不抛错
    target.emit('click');
    target.off('click', () => {});
  });

  it('on() 惰性创建 emitter', () => {
    const target = new EventTarget();
    const fn = vi.fn();
    target.on('click', fn);
    expect(target.hasEvent('click')).toBe(true);
    target.emit('click');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('off() 移除监听器', () => {
    const target = new EventTarget();
    const fn = vi.fn();
    target.on('click', fn);
    target.off('click', fn);
    target.emit('click');
    expect(fn).not.toHaveBeenCalled();
  });

  it('once 选项', () => {
    const target = new EventTarget();
    const fn = vi.fn();
    target.on('click', fn, {once: true});
    target.emit('click');
    target.emit('click');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('capture 选项添加 capture- 前缀', () => {
    const target = new EventTarget();
    const fn = vi.fn();
    target.on('click', fn, {capture: true});
    expect(target.hasEvent('capture-click')).toBe(true);
    target.emit('capture-click');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('eventTypes() 去掉 capture- 前缀', () => {
    const target = new EventTarget();
    target.on('click', () => {});
    target.on('mousedown', () => {}, {capture: true});
    const types = target.eventTypes();
    expect(types).toContain('click');
    expect(types).toContain('mousedown');
    expect(types).not.toContain('capture-mousedown');
  });
});

describe('SimulatedEvent', () => {
  function makeEvent(type: string, target: Graphics) {
    return new SimulatedEvent(type, target, new Event(type));
  }

  it('composedPath() 缓存', () => {
    const root = new Graphics();
    const child = new Graphics();
    root.add(child);
    const evt = makeEvent('click', child);
    const p1 = evt.composedPath();
    const p2 = evt.composedPath();
    expect(p1).toBe(p2); // 同引用
    // path() returns [root, child], reverse → [child, root] (target first)
    expect(p1).toEqual([child, root]);
  });

  it('stopPropagation() 阻止冒泡', () => {
    const evt = makeEvent('click', new Graphics());
    expect(evt.bubbles).toBe(true);
    evt.stopPropagation();
    expect(evt.bubbles).toBe(false);
  });

  it('copy() 共享 path 引用', () => {
    const root = new Graphics();
    const child = new Graphics();
    root.add(child);
    const evt = makeEvent('click', child);
    evt.composedPath();
    const copy = evt.copy();
    expect(copy.composedPath()).toBe(evt.composedPath());
    expect(copy.type).toBe(evt.type);
    expect(copy.target).toBe(evt.target);
  });
});

describe('EventDispatcher - 事件流', () => {
  function setupTree() {
    const root = new Graphics();
    root.setName('root');
    const child = new Graphics();
    child.setName('child');
    root.add(child);
    return {root, child};
  }

  it('normal flow: capture → target → bubble', () => {
    const {root, child} = setupTree();
    const dispatcher = new EventDispatcher();
    child.setDispatcher(dispatcher);

    const phases: number[] = [];
    root.on('click', (e: SimulatedEvent) => phases.push(e.eventPhase), {capture: true});
    child.on('click', (e: SimulatedEvent) => phases.push(e.eventPhase));
    root.on('click', (e: SimulatedEvent) => phases.push(e.eventPhase));

    const evt = new SimulatedEvent('click', child, new Event('click'));
    dispatcher.process(evt);

    // capture=1, target=2, bubble=3
    expect(phases).toEqual([1, 2, 3]);
  });

  it('stopPropagation 阻止冒泡', () => {
    const {root, child} = setupTree();
    const dispatcher = new EventDispatcher();
    child.setDispatcher(dispatcher);

    const calls: string[] = [];
    child.on('click', (e: SimulatedEvent) => {
      calls.push('child');
      e.stopPropagation();
    });
    root.on('click', () => calls.push('root'));

    const evt = new SimulatedEvent('click', child, new Event('click'));
    evt.stopPropagation(); // 阻止冒泡
    dispatcher.flow(evt);

    expect(calls).toContain('child');
    expect(calls).not.toContain('root');
  });

  it('pointermove 触发模拟 enter/over 事件', () => {
    const {child} = setupTree();
    const dispatcher = new EventDispatcher();
    child.setDispatcher(dispatcher);

    const events: string[] = [];
    child.on('pointerenter', () => events.push('enter'));
    child.on('pointerover', () => events.push('over'));
    child.on('pointermove', () => events.push('move'));

    const evt = new SimulatedEvent('pointermove', child, new Event('pointermove'));
    dispatcher.process(evt);

    expect(events).toContain('enter');
    expect(events).toContain('over');
    expect(events).toContain('move');
  });

  it('目标切换时触发 leave/out', () => {
    const {root, child} = setupTree();
    const child2 = new Graphics();
    child2.setName('child2');
    root.add(child2);
    const dispatcher = new EventDispatcher();

    const events: string[] = [];
    child.on('pointerleave', () => events.push('leave'));
    child.on('pointerout', () => events.push('out'));

    // 首先指向 child
    const evt1 = new SimulatedEvent('pointermove', child, new Event('pointermove'));
    child.setDispatcher(dispatcher);
    dispatcher.process(evt1);

    // 然后指向 child2
    const evt2 = new SimulatedEvent('pointermove', child2, new Event('pointermove'));
    child2.setDispatcher(dispatcher);
    dispatcher.process(evt2);

    expect(events).toContain('leave');
    expect(events).toContain('out');
  });
});
