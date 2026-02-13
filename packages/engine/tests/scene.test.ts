import {describe, it, expect} from 'vitest';
import {Scene, Node, Group} from '../src/scene';

describe('Scene - 场景管理', () => {
  function createNode(name: string, z = 0) {
    const node = Node.create('rect', {fill: 'red'});
    node.setName(name);
    node.z = z;
    return node;
  }

  describe('getQueue() 渲染队列', () => {
    it('收集所有 type=3 的 Node', () => {
      const scene = new Scene();
      const n1 = createNode('n1');
      const n2 = createNode('n2');
      scene.add(n1);
      scene.add(n2);
      const queue = scene.getQueue();
      expect(queue).toContain(n1);
      expect(queue).toContain(n2);
      expect(queue.length).toBe(2);
    });

    it('不收集 Group（type=2）', () => {
      const scene = new Scene();
      const group = new Group();
      const node = createNode('n');
      scene.add(group);
      group.add(node);
      const queue = scene.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0]).toBe(node);
    });

    it('按 ez 排序', () => {
      const scene = new Scene();
      const n1 = createNode('n1', 10);
      const n2 = createNode('n2', 5);
      const n3 = createNode('n3', 15);
      scene.add(n1);
      scene.add(n2);
      scene.add(n3);
      scene.update();
      const queue = scene.getQueue();
      expect(queue.map(n => n.name)).toEqual(['n2', 'n1', 'n3']);
    });

    it('缓存队列直到 dirty', () => {
      const scene = new Scene();
      scene.add(createNode('n1'));
      const q1 = scene.getQueue();
      const q2 = scene.getQueue();
      expect(q1).toBe(q2); // 同引用
    });

    it('dirty 后重新收集', () => {
      const scene = new Scene();
      scene.add(createNode('n1'));
      const q1 = scene.getQueue();
      scene.add(createNode('n2'));
      const q2 = scene.getQueue();
      expect(q2.length).toBe(2);
      expect(q1).not.toBe(q2);
    });
  });

  describe('pick() 拾取', () => {
    it('命中矩形节点', () => {
      const scene = new Scene();
      const node = Node.create('rect', {fill: 'red'});
      node.shape.from(0, 0, 100, 100);
      scene.add(node);
      scene.update();
      scene.getQueue();
      const hit = scene.pick([50, 50]);
      expect(hit).toBe(node);
    });

    it('未命中返回 undefined', () => {
      const scene = new Scene();
      const node = Node.create('rect', {fill: 'red'});
      node.shape.from(0, 0, 100, 100);
      scene.add(node);
      scene.update();
      scene.getQueue();
      const hit = scene.pick([200, 200]);
      expect(hit).toBeUndefined();
    });

    it('返回 z-index 最高的节点', () => {
      const scene = new Scene();
      const n1 = Node.create('rect', {fill: 'red'});
      n1.setName('back').setZ(1);
      n1.shape.from(0, 0, 100, 100);
      const n2 = Node.create('rect', {fill: 'blue'});
      n2.setName('front').setZ(10);
      n2.shape.from(0, 0, 100, 100);
      scene.add(n1);
      scene.add(n2);
      scene.update();
      scene.getQueue();
      const hit = scene.pick([50, 50]);
      expect(hit!.name).toBe('front');
    });
  });

  describe('position() 坐标映射', () => {
    it('默认无变换时原样返回', () => {
      const scene = new Scene();
      const pos = scene.position([100, 200]);
      expect(pos[0]).toBeCloseTo(100);
      expect(pos[1]).toBeCloseTo(200);
    });

    it('带缩放矩阵时逆变换', () => {
      const scene = new Scene();
      // 使用 scale() 设置缩放，update() 会计算 worldMatrix
      scene.scale(2, 2);
      scene.update();
      const pos = scene.position([200, 100]);
      expect(pos[0]).toBeCloseTo(100);
      expect(pos[1]).toBeCloseTo(50);
    });
  });

  describe('setMatrix() 缓存失效', () => {
    it('setMatrix 后 invertWorldMatrix 失效', () => {
      const scene = new Scene();
      scene.scale(1, 1);
      scene.update();
      // 首次 position 缓存逆矩阵
      scene.position([10, 10]);
      // 修改缩放
      scene.scale(2, 2);
      scene.update();
      // setMatrix 内部被 Scene 重写，会清除 invertWorldMatrix 缓存
      scene.setMatrix([...scene.matrix] as [number, number, number, number, number, number]);
      const pos = scene.position([20, 20]);
      expect(pos[0]).toBeCloseTo(10);
      expect(pos[1]).toBeCloseTo(10);
    });
  });
});

describe('Node - 场景节点', () => {
  it('Node.create() 工厂方法', () => {
    const node = Node.create('circle', {fill: 'red'});
    expect(node.shape.command).toBe('circle');
    expect(node.attrs.values.fill).toBe('red');
  });

  it('sign() 包含 shape 和 attrs 的变化', () => {
    const node = Node.create('rect', {fill: 'red'});
    node.update();
    node.setDirty(false);
    node.needUpdate = false;
    node.worldMatrixNeedUpdate = false;
    expect(node.sign()).toBe(false);

    node.shape.needUpdate = true;
    expect(node.sign()).toBe(true);
  });

  it('update() 构建 shape 并同步 boundingBox', () => {
    const node = Node.create('rect', {fill: 'red'});
    node.shape.from(10, 20, 100, 50);
    node.update();
    expect(node.shape.boundingBox.width).toBeCloseTo(100);
    expect(node.shape.boundingBox.height).toBeCloseTo(50);
  });
});

describe('Group', () => {
  it('type = 2', () => {
    const group = new Group();
    expect(group.type).toBe(2);
  });

  it('可以嵌套 Node', () => {
    const group = new Group();
    const node = Node.create('rect', {fill: 'red'});
    group.add(node);
    expect(group.children[0]).toBe(node);
  });
});
