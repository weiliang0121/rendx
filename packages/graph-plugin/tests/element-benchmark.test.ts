import {describe, it, expect, vi, beforeEach} from 'vitest';

vi.mock('rendx-canvas', () => ({
  CanvasRenderer: class {
    el = document.createElement('canvas');
    resize() {}
    dispose() {}
    clear() {}
  },
}));
vi.mock('rendx-svg', () => ({
  SvgRenderer: class {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    resize() {}
    dispose() {}
    clear() {}
  },
}));

import {App, Node} from 'rendx-engine';
import {createNode, createEdge} from '../src/create';
import {graphPlugin} from '../src/graph';

import type {GraphPlugin} from '../src/graph';
import type {NodeBase, EdgeBase} from '../src/types';

/**
 * Graph-plugin 性能基准测试
 * 覆盖元素 CRUD、批量操作、依赖追踪、serialize/deserialize 的耗时。
 */

function measure(name: string, fn: () => void, iterations = 1): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  console.log(`  [perf] ${name}: ${elapsed.toFixed(2)}ms (${iterations} iters, ${(elapsed / iterations).toFixed(4)}ms/op)`);
  return elapsed;
}

// ── 测试用元素类型 ──

interface BoxData extends NodeBase {
  label: string;
  color?: string;
}

const Box = createNode<BoxData>((ctx, data) => {
  const bg = Node.create('rect', {fill: data.color ?? '#eee', stroke: '#333'});
  bg.shape.from(0, 0, ctx.width, ctx.height);
  ctx.group.add(bg);

  const text = Node.create('text', {fill: '#333', textAnchor: 'middle', dominantBaseline: 'central'});
  text.shape.from(data.label, ctx.width / 2, ctx.height / 2);
  ctx.group.add(text);
});

interface LinkData extends EdgeBase {
  color?: string;
}

const Link = createEdge<LinkData>((ctx, data) => {
  const src = ctx.source;
  const tgt = ctx.target;
  if (!src || !tgt) return;
  const sd = src.data as BoxData;
  const td = tgt.data as BoxData;
  const line = Node.create('line', {stroke: data.color ?? '#999'});
  line.shape.from(sd.x + (sd.width ?? 0), sd.y + (sd.height ?? 0) / 2, td.x, td.y + (td.height ?? 0) / 2);
  ctx.group.add(line);
});

// ═══════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════

describe('Graph-plugin 性能基准', () => {
  let container: HTMLDivElement;
  let app: App;
  let graph: GraphPlugin;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    app = new App({width: 1200, height: 800});
    app.mount(container);
    graph = graphPlugin();
    app.use(graph);
    graph.register('box', Box);
    graph.register('link', Link);

    return () => {
      app.dispose();
      container.remove();
    };
  });

  // ═══════════════════════════════════════════════
  // add 性能
  // ═══════════════════════════════════════════════

  describe('add（创建元素）', () => {
    it('100 个 node', () => {
      const elapsed = measure('add 100 nodes', () => {
        for (let i = 0; i < 100; i++) {
          graph.add('box', {
            id: `n-${i}`,
            x: (i % 10) * 120,
            y: Math.floor(i / 10) * 80,
            width: 100,
            height: 60,
            label: `Node ${i}`,
          });
        }
      });
      expect(elapsed).toBeLessThan(2000);
      expect(graph.count).toBe(100);
    });

    it('500 个 node（批量）', () => {
      const elapsed = measure('batch add 500 nodes', () => {
        graph.batch(() => {
          for (let i = 0; i < 500; i++) {
            graph.add('box', {
              id: `n-${i}`,
              x: (i % 20) * 60,
              y: Math.floor(i / 20) * 40,
              width: 50,
              height: 30,
              label: `N${i}`,
            });
          }
        });
      });
      expect(elapsed).toBeLessThan(5000);
      expect(graph.count).toBe(500);
    });

    it('200 node + 200 edge', () => {
      const elapsed = measure('add 200 nodes + 200 edges', () => {
        // 先添加节点
        for (let i = 0; i < 200; i++) {
          graph.add('box', {
            id: `n-${i}`,
            x: (i % 20) * 60,
            y: Math.floor(i / 20) * 60,
            width: 50,
            height: 40,
            label: `N${i}`,
          });
        }
        // 添加边（每个节点连接下一个）
        for (let i = 0; i < 200; i++) {
          graph.add('link', {
            id: `e-${i}`,
            source: `n-${i}`,
            target: `n-${(i + 1) % 200}`,
          });
        }
      });
      expect(elapsed).toBeLessThan(5000);
      expect(graph.count).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════
  // update 性能
  // ═══════════════════════════════════════════════

  describe('update（更新元素）', () => {
    function setupNodes(count: number) {
      graph.batch(() => {
        for (let i = 0; i < count; i++) {
          graph.add('box', {
            id: `n-${i}`,
            x: (i % 20) * 60,
            y: Math.floor(i / 20) * 60,
            width: 50,
            height: 40,
            label: `N${i}`,
          });
        }
      });
    }

    it('100 个 node position-only update', () => {
      setupNodes(100);
      const elapsed = measure(
        'position-only update × 100',
        () => {
          for (let i = 0; i < 100; i++) {
            const el = graph.get<BoxData>(`n-${i}`)!;
            el.update({x: el.data.x + 10});
          }
        },
        10,
      );
      expect(elapsed / 10).toBeLessThan(200);
    });

    it('100 个 node 数据变更 update（触发重建）', () => {
      setupNodes(100);
      const elapsed = measure(
        'data-change update × 100',
        () => {
          for (let i = 0; i < 100; i++) {
            const el = graph.get<BoxData>(`n-${i}`)!;
            el.update({label: `Updated-${i}`} as Partial<BoxData>);
          }
        },
        5,
      );
      expect(elapsed / 5).toBeLessThan(500);
    });

    it('node 更新触发 edge 依赖重绘（cascading）', () => {
      setupNodes(50);
      // 添加边：扇形拓扑，n-0 连接所有其他节点
      graph.batch(() => {
        for (let i = 1; i < 50; i++) {
          graph.add('link', {
            id: `e-${i}`,
            source: 'n-0',
            target: `n-${i}`,
          });
        }
      });

      // 更新 n-0 会触发 49 条 edge 的依赖重绘
      const elapsed = measure(
        'update hub node (49 edges cascade)',
        () => {
          const el = graph.get<BoxData>('n-0')!;
          el.update({x: el.data.x + 1});
        },
        10,
      );
      expect(elapsed / 10).toBeLessThan(200);
    });
  });

  // ═══════════════════════════════════════════════
  // remove 性能
  // ═══════════════════════════════════════════════

  describe('remove（移除元素）', () => {
    it('100 个 node 逐个移除', () => {
      graph.batch(() => {
        for (let i = 0; i < 100; i++) {
          graph.add('box', {
            id: `n-${i}`,
            x: i * 10,
            y: 0,
            width: 50,
            height: 40,
            label: `N${i}`,
          });
        }
      });

      const elapsed = measure('remove 100 nodes', () => {
        for (let i = 0; i < 100; i++) {
          graph.remove(`n-${i}`);
        }
      });
      expect(elapsed).toBeLessThan(1000);
      expect(graph.count).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════
  // serialize / deserialize 性能
  // ═══════════════════════════════════════════════

  describe('serialize / deserialize', () => {
    function setupGraph(nodeCount: number, edgeCount: number) {
      graph.batch(() => {
        for (let i = 0; i < nodeCount; i++) {
          graph.add('box', {
            id: `n-${i}`,
            x: (i % 20) * 60,
            y: Math.floor(i / 20) * 60,
            width: 50,
            height: 40,
            label: `Node ${i}`,
            color: `#${((i * 37) % 256).toString(16).padStart(2, '0')}aa88`,
          });
        }
        for (let i = 0; i < edgeCount; i++) {
          graph.add('link', {
            id: `e-${i}`,
            source: `n-${i % nodeCount}`,
            target: `n-${(i + 1) % nodeCount}`,
            color: '#666',
          });
        }
      });
    }

    it('100 node + 100 edge serialize', () => {
      setupGraph(100, 100);
      const elapsed = measure(
        'serialize (100N + 100E)',
        () => {
          graph.serialize();
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(5);
    });

    it('500 node + 500 edge serialize', () => {
      setupGraph(500, 500);
      const elapsed = measure(
        'serialize (500N + 500E)',
        () => {
          graph.serialize();
        },
        20,
      );
      expect(elapsed / 20).toBeLessThan(20);
    });

    it('100 node + 100 edge deserialize', () => {
      setupGraph(100, 100);
      const data = graph.serialize();

      const elapsed = measure(
        'deserialize (100N + 100E)',
        () => {
          graph.deserialize(data);
        },
        10,
      );
      expect(elapsed / 10).toBeLessThan(500);
      expect(graph.count).toBe(200);
    });

    it('500 node + 500 edge deserialize', () => {
      setupGraph(500, 500);
      const data = graph.serialize();

      const elapsed = measure(
        'deserialize (500N + 500E)',
        () => {
          graph.deserialize(data);
        },
        3,
      );
      expect(elapsed / 3).toBeLessThan(5000);
      expect(graph.count).toBe(1000);
    });

    it('serialize 往返数据一致性', () => {
      setupGraph(50, 30);
      const data = graph.serialize();
      const originalIds = graph.getIds().sort();

      graph.deserialize(data);

      const restoredIds = graph.getIds().sort();
      expect(restoredIds).toEqual(originalIds);

      // 验证数据内容正确
      const el = graph.get<BoxData>('n-0');
      expect(el).toBeDefined();
      expect(el!.data.label).toBe('Node 0');
    });

    it('序列化负载大小', () => {
      setupGraph(500, 500);
      const data = graph.serialize();
      const str = JSON.stringify(data);
      const sizeKB = str.length / 1024;
      console.log(`  [size] 500N+500E serialize payload: ${sizeKB.toFixed(1)} KB`);
      expect(sizeKB).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════════════
  // 与 History 联动完整链路
  // ═══════════════════════════════════════════════

  describe('History 联动完整链路', () => {
    it('100 元素场景: push → modify → undo → redo', () => {
      // 构建场景
      graph.batch(() => {
        for (let i = 0; i < 80; i++) {
          graph.add('box', {
            id: `n-${i}`,
            x: (i % 10) * 120,
            y: Math.floor(i / 10) * 80,
            width: 100,
            height: 60,
            label: `N${i}`,
          });
        }
        for (let i = 0; i < 20; i++) {
          graph.add('link', {
            id: `e-${i}`,
            source: `n-${i}`,
            target: `n-${i + 1}`,
          });
        }
      });

      // push (toJSON + plugin.serialize)
      const pushElapsed = measure(
        'push (80N+20E)',
        () => {
          app.toJSON();
        },
        10,
      );

      // 修改后恢复
      const snapshot = app.toJSON();
      graph.get<BoxData>('n-0')!.update({x: 999});

      const restoreElapsed = measure(
        'restoreFromJSON (80N+20E)',
        () => {
          app.restoreFromJSON(snapshot);
        },
        5,
      );

      expect(pushElapsed / 10).toBeLessThan(50);
      expect(restoreElapsed / 5).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════════════
  // 查询性能
  // ═══════════════════════════════════════════════

  describe('查询性能', () => {
    function setupLargeGraph() {
      graph.batch(() => {
        for (let i = 0; i < 500; i++) {
          graph.add('box', {
            id: `n-${i}`,
            x: (i % 25) * 50,
            y: Math.floor(i / 25) * 50,
            width: 40,
            height: 30,
            label: `N${i}`,
          });
        }
        for (let i = 0; i < 500; i++) {
          graph.add('link', {
            id: `e-${i}`,
            source: `n-${i % 500}`,
            target: `n-${(i + 1) % 500}`,
          });
        }
      });
    }

    it('get 查询 (1000 元素)', () => {
      setupLargeGraph();
      const elapsed = measure(
        'get × 1000 lookups',
        () => {
          for (let i = 0; i < 1000; i++) {
            graph.get(`n-${i % 500}`);
          }
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(5);
    });

    it('getNodes / getEdges 过滤 (1000 元素)', () => {
      setupLargeGraph();
      const elapsed = measure(
        'getNodes + getEdges (1000 elements)',
        () => {
          graph.getNodes();
          graph.getEdges();
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(10);
    });

    it('getEdgesOf 单节点查询', () => {
      setupLargeGraph();
      const elapsed = measure(
        'getEdgesOf (1000 elements)',
        () => {
          graph.getEdgesOf('n-0');
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(5);
    });

    it('getAll (1000 元素)', () => {
      setupLargeGraph();
      const elapsed = measure(
        'getAll (1000 elements)',
        () => {
          graph.getAll();
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(5);
    });

    it('getIds (1000 元素)', () => {
      setupLargeGraph();
      const elapsed = measure(
        'getIds (1000 elements)',
        () => {
          graph.getIds();
        },
        100,
      );
      expect(elapsed / 100).toBeLessThan(5);
    });
  });
});
