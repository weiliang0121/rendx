import {describe, it, expect} from 'vitest';
import {Graphics} from '../src/core/graphics';

describe('Graphics - 场景图核心', () => {
  describe('树结构操作', () => {
    it('add() 建立父子关系', () => {
      const parent = new Graphics();
      const child = new Graphics();
      parent.add(child);
      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
    });

    it('add() 重复添加不会出现重复子节点', () => {
      const parent = new Graphics();
      const child = new Graphics();
      parent.add(child);
      parent.add(child);
      expect(parent.children.length).toBe(1);
    });

    it('add() 从旧父节点移除', () => {
      const p1 = new Graphics();
      const p2 = new Graphics();
      const child = new Graphics();
      p1.add(child);
      p2.add(child);
      expect(p1.children.length).toBe(0);
      expect(p2.children).toContain(child);
      expect(child.parent).toBe(p2);
    });

    it('add() 同名子节点抛出错误', () => {
      const parent = new Graphics();
      const c1 = new Graphics();
      const c2 = new Graphics();
      c1.setName('same');
      c2.setName('same');
      parent.add(c1);
      expect(() => parent.add(c2)).toThrow('same');
    });

    it('remove() 移除子节点', () => {
      const parent = new Graphics();
      const child = new Graphics();
      parent.add(child);
      parent.remove(child);
      expect(parent.children.length).toBe(0);
    });

    it('removeChildren() 清空', () => {
      const parent = new Graphics();
      parent.add(new Graphics());
      parent.add(new Graphics());
      parent.removeChildren();
      expect(parent.children.length).toBe(0);
    });

    it('unshift() 插到首位', () => {
      const parent = new Graphics();
      const c1 = new Graphics();
      const c2 = new Graphics();
      parent.add(c1);
      parent.unshift(c2);
      expect(parent.children[0]).toBe(c2);
    });
  });

  describe('查找与遍历', () => {
    it('find() 查找直接子节点', () => {
      const parent = new Graphics();
      const child = new Graphics();
      child.setName('target');
      parent.add(child);
      expect(parent.find('target')).toBe(child);
    });

    it('find() 深度查找', () => {
      const root = new Graphics();
      const mid = new Graphics();
      const leaf = new Graphics();
      leaf.setName('deep');
      root.add(mid);
      mid.add(leaf);
      expect(root.find('deep', true)).toBe(leaf);
      expect(root.find('deep', false)).toBeNull();
    });

    it('traverse() 遍历所有节点', () => {
      const root = new Graphics();
      const c1 = new Graphics();
      const c2 = new Graphics();
      root.add(c1);
      root.add(c2);
      const visited: Graphics[] = [];
      root.traverse((g) => visited.push(g as Graphics));
      expect(visited).toEqual([root, c1, c2]);
    });

    it('path() 返回从根到自身的路径', () => {
      const root = new Graphics();
      const mid = new Graphics();
      const leaf = new Graphics();
      root.add(mid);
      mid.add(leaf);
      expect(leaf.path()).toEqual([root, mid, leaf]);
    });

    it('root() 返回根节点', () => {
      const root = new Graphics();
      const mid = new Graphics();
      const leaf = new Graphics();
      root.add(mid);
      mid.add(leaf);
      expect(leaf.root()).toBe(root);
    });

    it('query() 按 className 查询', () => {
      const root = new Graphics();
      const c1 = new Graphics().setClassName('highlight');
      const c2 = new Graphics().setClassName('normal');
      root.add(c1);
      root.add(c2);
      expect(root.query('highlight')).toEqual([c1]);
    });
  });

  describe('脏标记传播', () => {
    it('setDirty(true) 向上传播到父节点', () => {
      const root = new Graphics();
      const child = new Graphics();
      root.add(child);
      root.setDirty(false);
      child.setDirty(true);
      expect(root.dirty).toBe(true);
    });

    it('setDirty(false) 向下传播到子节点', () => {
      const root = new Graphics();
      const child = new Graphics();
      root.add(child);
      child.setDirty(true);
      root.setDirty(false);
      expect(child.dirty).toBe(false);
    });

    it('add() 自动标记脏', () => {
      const root = new Graphics();
      root.setDirty(false);
      root.add(new Graphics());
      expect(root.dirty).toBe(true);
    });
  });

  describe('矩阵变换', () => {
    it('translate() 设置平移并标记需要更新', () => {
      const g = new Graphics();
      g.needUpdate = false;
      g.translate(10, 20);
      expect(g.translation[0]).toBe(10);
      expect(g.translation[1]).toBe(20);
      expect(g.needUpdate).toBe(true);
    });

    it('rotate() 设置旋转', () => {
      const g = new Graphics();
      g.rotate(Math.PI / 4);
      expect(g.rotation).toBeCloseTo(Math.PI / 4);
    });

    it('scale() 设置缩放', () => {
      const g = new Graphics();
      g.scale(2, 3);
      expect(g.scaling[0]).toBe(2);
      expect(g.scaling[1]).toBe(3);
    });

    it('update() 计算矩阵并传播到子节点', () => {
      const root = new Graphics();
      const child = new Graphics();
      root.add(child);
      root.translate(100, 0);
      child.translate(50, 0);
      root.update();
      // child.worldMatrix 应包含 root+child 的变换
      // worldMatrix[4] = tx 分量
      expect(child.worldMatrix[4]).toBeCloseTo(150);
    });

    it('update() 父级 needUpdate 传播 worldMatrixNeedUpdate', () => {
      const root = new Graphics();
      const child = new Graphics();
      root.add(child);
      root.update();
      // 重置
      root.needUpdate = false;
      child.needUpdate = false;
      child.worldMatrixNeedUpdate = false;
      // 父级改了
      root.translate(10, 0);
      root.update();
      // 子级 worldMatrix 应也更新
      expect(child.worldMatrix[4]).toBeCloseTo(10);
    });
  });

  describe('sign() 脏检查', () => {
    it('dirty=true 时返回 true', () => {
      const g = new Graphics();
      g.dirty = true;
      expect(g.sign()).toBe(true);
    });

    it('needUpdate=true 时返回 true', () => {
      const g = new Graphics();
      g.dirty = false;
      g.needUpdate = true;
      expect(g.sign()).toBe(true);
    });

    it('子节点脏时返回 true', () => {
      const root = new Graphics();
      const child = new Graphics();
      root.add(child);
      root.setDirty(false);
      root.needUpdate = false;
      root.worldMatrixNeedUpdate = false;
      child.needUpdate = true;
      expect(root.sign()).toBe(true);
    });

    it('全部干净时返回 false', () => {
      const root = new Graphics();
      const child = new Graphics();
      root.add(child);
      root.update();
      root.setDirty(false);
      expect(root.sign()).toBe(false);
    });

    it('display=false 时返回 false', () => {
      const g = new Graphics();
      g.display = false;
      g.dirty = true;
      expect(g.sign()).toBe(false);
    });
  });

  describe('可视性与指针事件', () => {
    it('renderable() = visible && display', () => {
      const g = new Graphics();
      expect(g.renderable()).toBe(true);
      g.setVisible(false);
      expect(g.renderable()).toBe(false);
    });

    it('setDisplay(false) 向下传播', () => {
      const root = new Graphics();
      const child = new Graphics();
      root.add(child);
      root.setDisplay(false);
      expect(child.display).toBe(false);
    });

    it('autoDisplay=false 阻止传播', () => {
      const root = new Graphics();
      const child = new Graphics();
      child.autoDisplay = false;
      root.add(child);
      root.setDisplay(false);
      expect(child.display).toBe(true);
    });
  });

  describe('z-index', () => {
    it('ez = 累加的 z 值', () => {
      const root = new Graphics();
      root.z = 10;
      const child = new Graphics();
      child.z = 5;
      root.add(child);
      root.update();
      expect(child.ez).toBe(15);
    });
  });

  describe('className 操作', () => {
    it('setClassName 设置并可查询', () => {
      const g = new Graphics();
      g.setClassName('a b c');
      expect(g.hasClassName('a')).toBe(true);
      expect(g.hasClassName('d')).toBe(false);
    });

    it('addClassName 追加', () => {
      const g = new Graphics();
      g.setClassName('a');
      g.addClassName('b');
      expect(g.hasClassName('b')).toBe(true);
      expect(g.className).toBe('a b');
    });

    it('addClassName 不重复', () => {
      const g = new Graphics();
      g.setClassName('a');
      g.addClassName('a');
      expect(g.className).toBe('a');
    });
  });
});
