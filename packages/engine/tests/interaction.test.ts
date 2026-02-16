import {describe, it, expect, vi, beforeEach} from 'vitest';
import {InteractionManager} from '../src/interaction';

describe('InteractionManager — 交互协调管理器', () => {
  let im: InteractionManager;

  beforeEach(() => {
    im = new InteractionManager();
  });

  // ════════════════════════════════════════════════════════════
  //  插件注册
  // ════════════════════════════════════════════════════════════

  describe('register / unregister', () => {
    it('注册插件后可读取优先级', () => {
      im.register('drag', {channels: ['pointer-exclusive'], priority: 10});
      expect(im.getPriority('drag')).toBe(10);
    });

    it('默认优先级为 0', () => {
      im.register('custom');
      expect(im.getPriority('custom')).toBe(0);
    });

    it('未注册插件的优先级为 0', () => {
      expect(im.getPriority('nonexistent')).toBe(0);
    });

    it('unregister 释放该插件持有的所有锁', () => {
      im.register('drag', {channels: ['pointer-exclusive'], priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      expect(im.isLocked('pointer-exclusive')).toBe(true);

      im.unregister('drag');
      expect(im.isLocked('pointer-exclusive')).toBe(false);
    });

    it('unregister 清理特征提供者', () => {
      im.register('graph');
      im.registerTraitProvider('graph', () => ({draggable: true}));
      expect(im.queryTrait({}, 'draggable')).toBe(true);

      im.unregister('graph');
      expect(im.queryTrait({}, 'draggable')).toBeUndefined();
    });

    it('重复注册同名插件覆盖之前的注册', () => {
      im.register('drag', {priority: 5});
      im.register('drag', {priority: 20});
      expect(im.getPriority('drag')).toBe(20);
    });
  });

  describe('setPriority / getPriority', () => {
    it('动态修改优先级', () => {
      im.register('drag', {priority: 10});
      im.setPriority('drag', 50);
      expect(im.getPriority('drag')).toBe(50);
    });

    it('未注册的插件调用 setPriority 无副作用', () => {
      im.setPriority('ghost', 100);
      expect(im.getPriority('ghost')).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  通道锁
  // ════════════════════════════════════════════════════════════

  describe('acquire / release', () => {
    it('空闲通道立即获取', () => {
      im.register('drag', {channels: ['pointer-exclusive'], priority: 10});
      const ok = im.acquire('pointer-exclusive', 'drag');
      expect(ok).toBe(true);
      expect(im.isLocked('pointer-exclusive')).toBe(true);
      expect(im.getOwner('pointer-exclusive')).toBe('drag');
    });

    it('同一插件重复 acquire 幂等', () => {
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      const ok = im.acquire('pointer-exclusive', 'drag');
      expect(ok).toBe(true);
      expect(im.getOwner('pointer-exclusive')).toBe('drag');
    });

    it('低优先级插件无法抢占高优先级锁', () => {
      im.register('connect', {priority: 15});
      im.register('selection', {priority: 5});
      im.acquire('pointer-exclusive', 'connect');

      const ok = im.acquire('pointer-exclusive', 'selection');
      expect(ok).toBe(false);
      expect(im.getOwner('pointer-exclusive')).toBe('connect');
    });

    it('同优先级先到先得', () => {
      im.register('pluginA', {priority: 10});
      im.register('pluginB', {priority: 10});
      im.acquire('pointer-exclusive', 'pluginA');

      const ok = im.acquire('pointer-exclusive', 'pluginB');
      expect(ok).toBe(false);
      expect(im.getOwner('pointer-exclusive')).toBe('pluginA');
    });

    it('高优先级插件抢占低优先级锁', () => {
      im.register('selection', {priority: 5});
      im.register('connect', {priority: 15});
      im.acquire('pointer-exclusive', 'selection');

      const ok = im.acquire('pointer-exclusive', 'connect');
      expect(ok).toBe(true);
      expect(im.getOwner('pointer-exclusive')).toBe('connect');
    });

    it('release 释放锁', () => {
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');

      im.release('pointer-exclusive', 'drag');
      expect(im.isLocked('pointer-exclusive')).toBe(false);
      expect(im.getOwner('pointer-exclusive')).toBeNull();
    });

    it('非持有者调用 release 静默忽略', () => {
      im.register('drag', {priority: 10});
      im.register('selection', {priority: 5});
      im.acquire('pointer-exclusive', 'drag');

      im.release('pointer-exclusive', 'selection'); // 非持有者
      expect(im.getOwner('pointer-exclusive')).toBe('drag');
    });

    it('释放不存在的通道静默忽略', () => {
      im.register('drag');
      expect(() => im.release('nonexistent', 'drag')).not.toThrow();
    });
  });

  describe('releaseAll', () => {
    it('释放指定插件持有的所有通道', () => {
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      im.acquire('keyboard-exclusive', 'drag');
      expect(im.isLocked('pointer-exclusive')).toBe(true);
      expect(im.isLocked('keyboard-exclusive')).toBe(true);

      im.releaseAll('drag');
      expect(im.isLocked('pointer-exclusive')).toBe(false);
      expect(im.isLocked('keyboard-exclusive')).toBe(false);
    });

    it('不影响其他插件的锁', () => {
      im.register('drag', {priority: 10});
      im.register('connect', {priority: 15});
      im.acquire('channelA', 'drag');
      im.acquire('channelB', 'connect');

      im.releaseAll('drag');
      expect(im.isLocked('channelA')).toBe(false);
      expect(im.isLocked('channelB')).toBe(true);
    });
  });

  describe('isLocked / getOwner / isLockedByOther', () => {
    it('未锁定通道返回正确状态', () => {
      expect(im.isLocked('pointer-exclusive')).toBe(false);
      expect(im.getOwner('pointer-exclusive')).toBeNull();
      expect(im.isLockedByOther('pointer-exclusive', 'drag')).toBe(false);
    });

    it('isLockedByOther — 自己持有时返回 false', () => {
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      expect(im.isLockedByOther('pointer-exclusive', 'drag')).toBe(false);
    });

    it('isLockedByOther — 别人持有时返回 true', () => {
      im.register('connect', {priority: 15});
      im.acquire('pointer-exclusive', 'connect');
      expect(im.isLockedByOther('pointer-exclusive', 'drag')).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  事件通知
  // ════════════════════════════════════════════════════════════

  describe('events', () => {
    it('acquire 触发 interaction:acquired', () => {
      const handler = vi.fn();
      im.events.on('interaction:acquired', handler);
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');

      expect(handler).toHaveBeenCalledWith({channel: 'pointer-exclusive', owner: 'drag'});
    });

    it('幂等 acquire 第二次不再触发 acquired 事件', () => {
      const handler = vi.fn();
      im.events.on('interaction:acquired', handler);
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      im.acquire('pointer-exclusive', 'drag');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('release 触发 interaction:released', () => {
      const handler = vi.fn();
      im.events.on('interaction:released', handler);
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      im.release('pointer-exclusive', 'drag');

      expect(handler).toHaveBeenCalledWith({channel: 'pointer-exclusive', owner: 'drag'});
    });

    it('非持有者 release 不触发事件', () => {
      const handler = vi.fn();
      im.events.on('interaction:released', handler);
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      im.release('pointer-exclusive', 'selection');

      expect(handler).not.toHaveBeenCalled();
    });

    it('抢占触发 interaction:preempted + interaction:acquired', () => {
      const preemptHandler = vi.fn();
      const acquireHandler = vi.fn();
      im.events.on('interaction:preempted', preemptHandler);
      im.events.on('interaction:acquired', acquireHandler);

      im.register('selection', {priority: 5});
      im.register('connect', {priority: 15});
      im.acquire('pointer-exclusive', 'selection');

      acquireHandler.mockClear(); // 清除 selection 的 acquire 事件

      im.acquire('pointer-exclusive', 'connect');

      expect(preemptHandler).toHaveBeenCalledWith({
        channel: 'pointer-exclusive',
        preempted: 'selection',
        by: 'connect',
      });
      expect(acquireHandler).toHaveBeenCalledWith({
        channel: 'pointer-exclusive',
        owner: 'connect',
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  //  元素特征查询
  // ════════════════════════════════════════════════════════════

  describe('Trait Providers', () => {
    it('无提供者时返回空对象', () => {
      expect(im.queryTraits({})).toEqual({});
    });

    it('单个提供者返回特征', () => {
      im.registerTraitProvider('graph', () => ({draggable: true, selectable: true}));
      const traits = im.queryTraits({});
      expect(traits.draggable).toBe(true);
      expect(traits.selectable).toBe(true);
    });

    it('提供者返回 null 时跳过', () => {
      im.registerTraitProvider('graph', target => {
        if (target === 'skip') return null;
        return {draggable: true};
      });

      expect(im.queryTraits('skip')).toEqual({});
      expect(im.queryTraits('hit')).toEqual({draggable: true});
    });

    it('多提供者合并，后注册的覆盖先注册的同名 key', () => {
      im.registerTraitProvider('graph', () => ({draggable: true, selectable: true}));
      im.registerTraitProvider('custom', () => ({draggable: false, customProp: 42}));

      const traits = im.queryTraits({});
      expect(traits.draggable).toBe(false); // 被 custom 覆盖
      expect(traits.selectable).toBe(true);
      expect(traits.customProp).toBe(42);
    });

    it('queryTrait 便捷方法', () => {
      im.registerTraitProvider('graph', () => ({draggable: true}));
      expect(im.queryTrait({}, 'draggable')).toBe(true);
      expect(im.queryTrait({}, 'unknown')).toBeUndefined();
    });

    it('提供者可以基于目标对象返回不同特征', () => {
      const nodeGroup = {name: 'node-1', role: 'node'};
      const edgeGroup = {name: 'edge-1', role: 'edge'};

      im.registerTraitProvider('graph', (target: unknown) => {
        const t = target as {role: string};
        if (t.role === 'node') return {draggable: true, connectable: true};
        if (t.role === 'edge') return {draggable: false, positionDerived: true};
        return null;
      });

      expect(im.queryTraits(nodeGroup)).toEqual({draggable: true, connectable: true});
      expect(im.queryTraits(edgeGroup)).toEqual({draggable: false, positionDerived: true});
    });
  });

  // ════════════════════════════════════════════════════════════
  //  多通道场景
  // ════════════════════════════════════════════════════════════

  describe('多通道', () => {
    it('不同通道互不影响', () => {
      im.register('drag', {priority: 10});
      im.register('zoom', {priority: 5});

      im.acquire('pointer-exclusive', 'drag');
      im.acquire('viewport', 'zoom');

      expect(im.getOwner('pointer-exclusive')).toBe('drag');
      expect(im.getOwner('viewport')).toBe('zoom');
      expect(im.isLockedByOther('pointer-exclusive', 'zoom')).toBe(true);
      expect(im.isLockedByOther('viewport', 'drag')).toBe(true);
    });

    it('同一插件可持有多个通道的锁', () => {
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      im.acquire('keyboard-exclusive', 'drag');

      expect(im.getOwner('pointer-exclusive')).toBe('drag');
      expect(im.getOwner('keyboard-exclusive')).toBe('drag');
    });
  });

  // ════════════════════════════════════════════════════════════
  //  未注册插件
  // ════════════════════════════════════════════════════════════

  describe('未注册插件', () => {
    it('未注册插件可以 acquire（优先级视为 0）', () => {
      const ok = im.acquire('pointer-exclusive', 'unregistered');
      expect(ok).toBe(true);
      expect(im.getOwner('pointer-exclusive')).toBe('unregistered');
    });

    it('未注册插件无法抢占高优先级锁', () => {
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');

      const ok = im.acquire('pointer-exclusive', 'unregistered');
      expect(ok).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  dispose
  // ════════════════════════════════════════════════════════════

  describe('dispose', () => {
    it('清理所有状态', () => {
      im.register('drag', {priority: 10});
      im.acquire('pointer-exclusive', 'drag');
      im.registerTraitProvider('graph', () => ({draggable: true}));

      im.dispose();

      expect(im.isLocked('pointer-exclusive')).toBe(false);
      expect(im.getPriority('drag')).toBe(0);
      expect(im.queryTraits({})).toEqual({});
    });

    it('dispose 后事件监听器被清除', () => {
      const handler = vi.fn();
      im.events.on('interaction:acquired', handler);
      im.dispose();

      im.acquire('pointer-exclusive', 'drag');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════
  //  完整交互场景
  // ════════════════════════════════════════════════════════════

  describe('典型场景 — drag/connect/selection 三方协调', () => {
    beforeEach(() => {
      im.register('connect', {channels: ['pointer-exclusive'], priority: 15});
      im.register('drag', {channels: ['pointer-exclusive'], priority: 10});
      im.register('selection', {channels: ['pointer-exclusive'], priority: 5});
    });

    it('drag 获取锁后 selection 被屏蔽', () => {
      im.acquire('pointer-exclusive', 'drag');

      expect(im.isLockedByOther('pointer-exclusive', 'selection')).toBe(true);
      expect(im.isLockedByOther('pointer-exclusive', 'drag')).toBe(false);
    });

    it('connect 获取锁后 drag 和 selection 都被屏蔽', () => {
      im.acquire('pointer-exclusive', 'connect');

      expect(im.isLockedByOther('pointer-exclusive', 'drag')).toBe(true);
      expect(im.isLockedByOther('pointer-exclusive', 'selection')).toBe(true);
    });

    it('drag 持有锁时 connect 可以抢占', () => {
      im.acquire('pointer-exclusive', 'drag');
      const ok = im.acquire('pointer-exclusive', 'connect');

      expect(ok).toBe(true);
      expect(im.getOwner('pointer-exclusive')).toBe('connect');
    });

    it('selection 持有锁时 drag 可以抢占', () => {
      im.acquire('pointer-exclusive', 'selection');
      const ok = im.acquire('pointer-exclusive', 'drag');

      expect(ok).toBe(true);
      expect(im.getOwner('pointer-exclusive')).toBe('drag');
    });

    it('drag 持有锁时 selection 无法抢占', () => {
      im.acquire('pointer-exclusive', 'drag');
      const ok = im.acquire('pointer-exclusive', 'selection');

      expect(ok).toBe(false);
      expect(im.getOwner('pointer-exclusive')).toBe('drag');
    });

    it('完整生命周期：drag acquire → release → selection acquire', () => {
      im.acquire('pointer-exclusive', 'drag');
      expect(im.getOwner('pointer-exclusive')).toBe('drag');

      im.release('pointer-exclusive', 'drag');
      expect(im.isLocked('pointer-exclusive')).toBe(false);

      im.acquire('pointer-exclusive', 'selection');
      expect(im.getOwner('pointer-exclusive')).toBe('selection');
    });

    it('抢占事件链完整性', () => {
      const events: string[] = [];
      im.events.on('interaction:acquired', e => events.push(`acquired:${e.owner}`));
      im.events.on('interaction:preempted', e => events.push(`preempted:${e.preempted}→${e.by}`));
      im.events.on('interaction:released', e => events.push(`released:${e.owner}`));

      im.acquire('pointer-exclusive', 'selection');
      im.acquire('pointer-exclusive', 'connect'); // 抢占
      im.release('pointer-exclusive', 'connect');

      expect(events).toEqual(['acquired:selection', 'preempted:selection→connect', 'acquired:connect', 'released:connect']);
    });
  });

  describe('典型场景 — 动态优先级调整', () => {
    it('用户可在运行时提升 selection 优先级让其不被 drag 抢占', () => {
      im.register('drag', {channels: ['pointer-exclusive'], priority: 10});
      im.register('selection', {channels: ['pointer-exclusive'], priority: 5});

      // 用户提升 selection 优先级
      im.setPriority('selection', 20);

      im.acquire('pointer-exclusive', 'selection');
      const ok = im.acquire('pointer-exclusive', 'drag');

      expect(ok).toBe(false);
      expect(im.getOwner('pointer-exclusive')).toBe('selection');
    });
  });
});
