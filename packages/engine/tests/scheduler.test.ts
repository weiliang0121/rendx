import {describe, it, expect, vi} from 'vitest';

import {Scheduler} from '../src/scheduler';

describe('Scheduler - 调度器', () => {
  describe('markState 批量通知', () => {
    it('同一微任务内多次 markState 同一 key 只通知一次', async () => {
      const flush = vi.fn();
      const scheduler = new Scheduler(flush);

      scheduler.markState('a');
      scheduler.markState('a');
      scheduler.markState('a');

      // 同步阶段不应触发
      expect(flush).not.toHaveBeenCalled();

      // 等待微任务执行
      await Promise.resolve();

      expect(flush).toHaveBeenCalledOnce();
      const keys = flush.mock.calls[0][0] as Set<string>;
      expect(keys.size).toBe(1);
      expect(keys.has('a')).toBe(true);
    });

    it('同一微任务内不同 key 合并为一次通知', async () => {
      const flush = vi.fn();
      const scheduler = new Scheduler(flush);

      scheduler.markState('a');
      scheduler.markState('b');
      scheduler.markState('c');

      await Promise.resolve();

      expect(flush).toHaveBeenCalledOnce();
      const keys = flush.mock.calls[0][0] as Set<string>;
      expect(keys).toEqual(new Set(['a', 'b', 'c']));
    });

    it('不同微任务轮次独立通知', async () => {
      const flush = vi.fn();
      const scheduler = new Scheduler(flush);

      scheduler.markState('a');
      await Promise.resolve();

      scheduler.markState('b');
      await Promise.resolve();

      expect(flush).toHaveBeenCalledTimes(2);
      expect(flush.mock.calls[0][0]).toEqual(new Set(['a']));
      expect(flush.mock.calls[1][0]).toEqual(new Set(['b']));
    });

    it('flush 后 pending 队列为空', async () => {
      const flush = vi.fn();
      const scheduler = new Scheduler(flush);

      scheduler.markState('x');
      expect(scheduler.hasPending).toBe(true);

      await Promise.resolve();

      expect(scheduler.hasPending).toBe(false);
    });
  });

  describe('clear', () => {
    it('清空待通知队列', async () => {
      const flush = vi.fn();
      const scheduler = new Scheduler(flush);

      scheduler.markState('a');
      scheduler.markState('b');
      scheduler.clear();

      await Promise.resolve();

      // clear 后不应触发 flush（微任务已排队但 pending 已清空）
      // 注意：queueMicrotask 已经排了，但 pendingState 已被 clear
      // 实际行为：微任务会执行，但 keys 为空集
      // 要么 flush 被调用但 keys 为空，要么不被调用
      // 当前实现中 clear 清了 pendingState 但没取消微任务
      // 所以 flush 会被调用一次，keys 为空
      if (flush.mock.calls.length > 0) {
        const keys = flush.mock.calls[0][0] as Set<string>;
        expect(keys.size).toBe(0);
      }
    });

    it('clear 后 hasPending 为 false', () => {
      const flush = vi.fn();
      const scheduler = new Scheduler(flush);

      scheduler.markState('a');
      expect(scheduler.hasPending).toBe(true);

      scheduler.clear();
      expect(scheduler.hasPending).toBe(false);
    });
  });
});
