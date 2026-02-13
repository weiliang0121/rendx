import {describe, it, expect} from 'vitest';
import {Graphics} from '../src/core/graphics';
import {Scene, Node, Group} from '../src/scene';
import {SimulatedEvent} from '../src/events/event';

/**
 * 性能基准测试
 * 使用 performance.now() 记录关键操作耗时，验证在大规模场景下的可接受性。
 */

function measure(name: string, fn: () => void, iterations = 1): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  console.log(`  [perf] ${name}: ${elapsed.toFixed(2)}ms (${iterations} iters, ${(elapsed / iterations).toFixed(4)}ms/op)`);
  return elapsed;
}

describe('性能基准', () => {
  describe('场景图构建', () => {
    it('构建 5000 个 Node', () => {
      const elapsed = measure('构建 5000 Node', () => {
        const scene = new Scene();
        for (let i = 0; i < 5000; i++) {
          const node = Node.create('rect', {fill: 'red', opacity: 1});
          node.shape.from(i, i, 10, 10);
          scene.add(node);
        }
      });
      expect(elapsed).toBeLessThan(5000);
    });

    it('3 层嵌套 Group, 每层 10 个子节点', () => {
      const elapsed = measure('3层嵌套 Group', () => {
        const scene = new Scene();
        function buildTree(parent: Graphics, depth: number) {
          if (depth === 0) return;
          for (let i = 0; i < 10; i++) {
            if (depth === 1) {
              const node = Node.create('rect', {fill: 'red'});
              parent.add(node);
            } else {
              const group = new Group();
              parent.add(group);
              buildTree(group, depth - 1);
            }
          }
        }
        buildTree(scene, 3);
      });
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('getQueue 与排序', () => {
    it('5000 节点 getQueue', () => {
      const scene = new Scene();
      for (let i = 0; i < 5000; i++) {
        const node = Node.create('rect', {fill: 'red'});
        node.z = Math.random() * 1000;
        scene.add(node);
      }
      scene.update();

      const elapsed = measure(
        'getQueue (5000 nodes)',
        () => {
          scene.setDirty(true);
          scene.getQueue();
        },
        10,
      );
      expect(elapsed / 10).toBeLessThan(100);
    });

    it('getQueue 缓存命中', () => {
      const scene = new Scene();
      for (let i = 0; i < 5000; i++) {
        scene.add(Node.create('rect', {fill: 'red'}));
      }
      scene.getQueue();

      const elapsed = measure(
        'getQueue (缓存)',
        () => {
          scene.getQueue();
        },
        1000,
      );
      expect(elapsed / 1000).toBeLessThan(0.5);
    });
  });

  describe('update 矩阵更新', () => {
    it('5000 节点 update', () => {
      const scene = new Scene();
      for (let i = 0; i < 5000; i++) {
        const node = Node.create('rect', {fill: 'red'});
        node.shape.from(i, i, 10, 10);
        node.translate(i, i);
        scene.add(node);
      }

      const elapsed1 = measure('update 首次 (5000)', () => {
        scene.needUpdate = true;
        scene.worldMatrixNeedUpdate = true;
        scene.update();
      });
      expect(elapsed1).toBeLessThan(500);
    });
  });

  describe('sign 脏检查', () => {
    it('5000 节点 sign（全干净）', () => {
      const scene = new Scene();
      for (let i = 0; i < 5000; i++) {
        scene.add(Node.create('rect', {fill: 'red'}));
      }
      scene.update();
      scene.setDirty(false);

      const elapsed = measure(
        'sign 全干净 (5000)',
        () => {
          scene.sign();
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(10);
    });
  });

  describe('动画 tick', () => {
    it('500 个动画 tick', () => {
      const scene = new Scene();
      for (let i = 0; i < 500; i++) {
        const node = Node.create('rect', {fill: 'red'});
        node.useTransform();
        node.transform!.translate(100, 100).duration(1000);
        scene.add(node);
      }

      const elapsed = measure(
        'tick (500 animations)',
        () => {
          scene.tick(500);
        },
        50,
      );
      expect(elapsed / 50).toBeLessThan(50);
    });
  });

  describe('事件分发', () => {
    it('composedPath 缓存效果', () => {
      let current = new Graphics();
      for (let i = 0; i < 50; i++) {
        const child = new Graphics();
        current.add(child);
        current = child;
      }
      const evt = new SimulatedEvent('click', current, new Event('click'));

      const elapsed = measure(
        'composedPath (50 depth)',
        () => {
          const e = evt.copy();
          for (let j = 0; j < 100; j++) {
            e.composedPath();
          }
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(5);
    });

    it('EventTarget 惰性创建', () => {
      const elapsed = measure('创建 5000 Graphics (惰性 emitter)', () => {
        for (let i = 0; i < 5000; i++) {
          new Graphics();
        }
      });
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('全链路 render pipeline', () => {
    it('500 节点: tick → sign → update → getQueue', () => {
      const scene = new Scene();
      for (let i = 0; i < 500; i++) {
        const node = Node.create('rect', {fill: 'red', opacity: 1});
        node.shape.from(i * 12, 0, 10, 10);
        node.useTransform();
        node.transform!.translate(100, 0).duration(1000);
        scene.add(node);
      }

      const elapsed = measure(
        '全链路 500 节点',
        () => {
          scene.tick(500);
          if (scene.sign()) {
            scene.update();
            scene.getQueue();
          }
        },
        50,
      );
      expect(elapsed / 50).toBeLessThan(100);
    });
  });
});
