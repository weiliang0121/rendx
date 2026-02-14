import {describe, it, expect, vi} from 'vitest';

// Mock rendx-canvas 和 rendx-svg 避免 OffscreenCanvas 依赖
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

import {Node, Group, Layer} from '../src/scene';
import {App} from '../src/app';
import {serialize, deserialize, serializeLayer} from '../src/serialization';

import type {RendxJSON, NodeJSON, GroupJSON} from '../src/serialization';

// ========================
// Helpers
// ========================

function createRect(name: string, x = 0, y = 0, w = 100, h = 50) {
  const node = Node.create('rect', {fill: 'red'});
  node.shape.from(x, y, w, h);
  node.setName(name);
  return node;
}

function createCircle(name: string, cx = 0, cy = 0, r = 10) {
  const node = Node.create('circle', {fill: 'blue', stroke: '#000'});
  node.shape.from(cx, cy, r);
  node.setName(name);
  return node;
}

function createLine(name: string) {
  const node = Node.create('line', {stroke: 'black', lineWidth: 2});
  node.shape.from(0, 0, 100, 100);
  node.setName(name);
  return node;
}

function createText(name: string) {
  const node = Node.create('text', {fill: 'black', fontSize: 14});
  node.shape.from('hello', 10, 20);
  node.setName(name);
  return node;
}

// ========================
// Tests
// ========================

describe('Serialization - 序列化', () => {
  describe('Node.shapeType', () => {
    it('Node.create 保存 shapeType', () => {
      const rect = Node.create('rect', {});
      expect(rect.shapeType).toBe('rect');
      const circle = Node.create('circle', {});
      expect(circle.shapeType).toBe('circle');
      const text = Node.create('text', {});
      expect(text.shapeType).toBe('text');
    });
  });

  describe('serializeLayer()', () => {
    it('序列化空层', () => {
      const layer = new Layer('test', 0, {width: 800, height: 600});
      const json = serializeLayer(layer);
      expect(json.name).toBe('test');
      expect(json.index).toBe(0);
      expect(json.children).toEqual([]);
      expect(json.culling).toBeUndefined(); // default true → omitted
    });

    it('序列化含节点的层', () => {
      const layer = new Layer('main', 1, {width: 800, height: 600});
      layer.add(createRect('r1', 10, 20, 100, 50));
      const json = serializeLayer(layer);
      expect(json.children.length).toBe(1);
      const child = json.children[0] as NodeJSON;
      expect(child.type).toBe('node');
      expect(child.shapeType).toBe('rect');
      expect(child.args).toEqual([10, 20, 100, 50]);
      expect(child.name).toBe('r1');
      expect(child.attrs).toEqual({fill: 'red'});
    });

    it('序列化 culling=false', () => {
      const layer = new Layer('text-layer', 2, {width: 800, height: 600});
      layer.culling = false;
      const json = serializeLayer(layer);
      expect(json.culling).toBe(false);
    });
  });

  describe('各种 Shape 类型', () => {
    it('circle', () => {
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(createCircle('c1', 50, 60, 25));
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('circle');
      expect(child.args).toEqual([50, 60, 25]);
    });

    it('line', () => {
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(createLine('l1'));
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('line');
      expect(child.args).toEqual([0, 0, 100, 100]);
    });

    it('text', () => {
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(createText('t1'));
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('text');
      expect(child.args).toEqual(['hello', 10, 20]);
    });

    it('path', () => {
      const node = Node.create('path', {fill: 'green'});
      node.shape.from('M0 0 L100 100 Z');
      node.setName('p1');
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('path');
      expect(child.args).toEqual(['M0 0 L100 100 Z']);
    });

    it('polygon with options', () => {
      const node = Node.create('polygon', {fill: 'orange'});
      node.shape.from([
        [0, 0],
        [100, 0],
        [50, 80],
      ]);
      node.shape.options('cardinal', false);
      node.setName('pg1');
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('polygon');
      expect(child.args).toEqual([
        [
          [0, 0],
          [100, 0],
          [50, 80],
        ],
      ]);
      expect(child.options).toEqual(['cardinal', false]);
    });

    it('curve with options', () => {
      const segments = [
        [
          [0, 0],
          [10, 20],
          [30, 10],
        ],
      ];
      const node = Node.create('curve', {stroke: 'red'});
      node.shape.from(segments);
      node.shape.options('basis', true);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('curve');
      expect(child.args).toEqual([segments]);
      expect(child.options).toEqual(['basis', true]);
    });

    it('symbol with options', () => {
      const node = Node.create('symbol', {fill: 'purple'});
      node.shape.from(5);
      node.shape.options('star');
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('symbol');
      expect(child.args).toEqual([5]);
      expect(child.options).toEqual(['star']);
    });

    it('round with options', () => {
      const node = Node.create('round', {fill: 'pink'});
      node.shape.from(10, 20, 100, 50);
      node.shape.options(5, 5);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('round');
      expect(child.args).toEqual([10, 20, 100, 50]);
      expect(child.options).toEqual([5, 5]);
    });

    it('image', () => {
      const node = Node.create('image', {});
      node.shape.from('https://example.com/img.png', 0, 0, 200, 150);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('image');
      expect(child.args).toEqual(['https://example.com/img.png', 0, 0, 200, 150]);
    });

    it('arc', () => {
      const node = Node.create('arc', {stroke: 'blue'});
      node.shape.from(50, 0, Math.PI, 30);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('arc');
      expect(child.args).toEqual([50, 0, Math.PI, 30]);
    });

    it('sector with options', () => {
      const node = Node.create('sector', {fill: 'gold'});
      node.shape.from(50, 0, Math.PI, 10, 40);
      node.shape.options(3);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('sector');
      expect(child.args).toEqual([50, 0, Math.PI, 10, 40, undefined]);
      expect(child.options).toEqual([3]);
    });

    it('area with options', () => {
      const upper = [
        [
          [0, 0],
          [100, 0],
        ],
      ];
      const lower = [
        [
          [0, 50],
          [100, 50],
        ],
      ];
      const node = Node.create('area', {fill: 'lightblue'});
      node.shape.from(upper, lower);
      node.shape.options('monotoneX');
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.shapeType).toBe('area');
      expect(child.args).toEqual([upper, lower]);
      expect(child.options).toEqual(['monotoneX']);
    });
  });

  describe('Graphics 属性序列化', () => {
    it('跳过默认值', () => {
      const node = createRect('r1');
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      // 默认值不应出现
      expect(child.z).toBeUndefined();
      expect(child.visible).toBeUndefined();
      expect(child.display).toBeUndefined();
      expect(child.translate).toBeUndefined();
      expect(child.rotate).toBeUndefined();
      expect(child.scale).toBeUndefined();
      expect(child.data).toBeUndefined();
    });

    it('保存 translate', () => {
      const node = createRect('r1');
      node.translate(100, 200);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.translate).toEqual([100, 200]);
    });

    it('保存 rotate', () => {
      const node = createRect('r1');
      node.rotate(Math.PI / 4);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.rotate).toBe(Math.PI / 4);
    });

    it('保存 scale', () => {
      const node = createRect('r1');
      node.scale(2, 3);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.scale).toEqual([2, 3]);
    });

    it('保存 z', () => {
      const node = createRect('r1');
      node.setZ(5);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.z).toBe(5);
    });

    it('保存 visible=false', () => {
      const node = createRect('r1');
      node.setVisible(false);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.visible).toBe(false);
    });

    it('保存 display=false', () => {
      const node = createRect('r1');
      node.setDisplay(false);
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.display).toBe(false);
    });

    it('保存 className', () => {
      const node = createRect('r1');
      node.setClassName('foo bar');
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.className).toBe('foo bar');
    });

    it('保存 data', () => {
      const node = createRect('r1');
      node.data = {key: 'value', num: 42};
      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.data).toEqual({key: 'value', num: 42});
    });
  });

  describe('Group 序列化', () => {
    it('序列化 Group 及其子节点', () => {
      const group = new Group();
      group.setName('g1');
      group.add(createRect('r1', 10, 20, 100, 50));
      group.add(createCircle('c1', 30, 40, 15));

      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(group);
      const json = serializeLayer(layer);

      expect(json.children.length).toBe(1);
      const g = json.children[0] as GroupJSON;
      expect(g.type).toBe('group');
      expect(g.name).toBe('g1');
      expect(g.children.length).toBe(2);
      expect((g.children[0] as NodeJSON).shapeType).toBe('rect');
      expect((g.children[1] as NodeJSON).shapeType).toBe('circle');
    });

    it('序列化嵌套 Group', () => {
      const outer = new Group();
      outer.setName('outer');
      const inner = new Group();
      inner.setName('inner');
      inner.add(createRect('r1'));
      outer.add(inner);

      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(outer);
      const json = serializeLayer(layer);

      const g1 = json.children[0] as GroupJSON;
      expect(g1.name).toBe('outer');
      const g2 = g1.children[0] as GroupJSON;
      expect(g2.type).toBe('group');
      expect(g2.name).toBe('inner');
      expect(g2.children.length).toBe(1);
    });

    it('Group 保存 transform', () => {
      const group = new Group();
      group.translate(50, 100);
      group.rotate(Math.PI / 6);
      group.scale(1.5, 1.5);

      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(group);
      const json = serializeLayer(layer);
      const g = json.children[0] as GroupJSON;
      expect(g.translate).toEqual([50, 100]);
      expect(g.rotate).toBeCloseTo(Math.PI / 6);
      expect(g.scale).toEqual([1.5, 1.5]);
    });
  });

  describe('Gradient 和 ClipPath', () => {
    it('序列化 gradient', () => {
      const node = Node.create('rect', {fill: 'url(#grad)'});
      node.shape.from(0, 0, 100, 50);
      node.attrs.gradient({
        id: 'grad',
        type: 'linear',
        direction: [0, 0, 1, 0],
        stops: [
          [0, 'red'],
          [1, 'blue'],
        ],
      });

      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.gradient).toBeDefined();
      expect(child.gradient!.type).toBe('linear');
      expect(child.gradient!.stops).toEqual([
        [0, 'red'],
        [1, 'blue'],
      ]);
    });

    it('序列化 clipPath', () => {
      const node = Node.create('rect', {fill: 'red'});
      node.shape.from(0, 0, 100, 50);
      node.attrs.clip({id: 'clip1', path: 'M0 0 L100 0 L100 50 Z'});

      const layer = new Layer('l', 0, {width: 800, height: 600});
      layer.add(node);
      const json = serializeLayer(layer);
      const child = json.children[0] as NodeJSON;
      expect(child.clipPath).toBeDefined();
      expect(child.clipPath!.path).toBe('M0 0 L100 0 L100 50 Z');
    });
  });
});

describe('Deserialization - 反序列化', () => {
  const cfg = {width: 800, height: 600};

  describe('基本反序列化', () => {
    it('反序列化空场景', () => {
      const json: RendxJSON = {version: 1, width: 800, height: 600, layers: []};
      const layers = deserialize(json, cfg);
      expect(layers).toEqual([]);
    });

    it('反序列化单层单节点', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [
          {
            name: 'main',
            index: 0,
            children: [
              {
                type: 'node',
                shapeType: 'rect',
                args: [10, 20, 100, 50],
                name: 'r1',
                attrs: {fill: 'red'},
              },
            ],
          },
        ],
      };
      const layers = deserialize(json, cfg);
      expect(layers.length).toBe(1);
      expect(layers[0].layerName).toBe('main');
      expect(layers[0].layerIndex).toBe(0);
      expect(layers[0].children.length).toBe(1);

      const node = layers[0].children[0] as InstanceType<typeof Node>;
      expect(node.name).toBe('r1');
      expect(node.shapeType).toBe('rect');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node.shape as any).x).toBe(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node.shape as any).y).toBe(20);
      expect(node.attrs.values.fill).toBe('red');
    });

    it('反序列化 culling=false', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [{name: 'text', index: 0, culling: false, children: []}],
      };
      const layers = deserialize(json, cfg);
      expect(layers[0].culling).toBe(false);
    });
  });

  describe('Shape 类型反序列化', () => {
    it('circle', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [
          {
            name: 'l',
            index: 0,
            children: [{type: 'node', shapeType: 'circle', args: [50, 60, 25], attrs: {fill: 'blue'}}],
          },
        ],
      };
      const layers = deserialize(json, cfg);
      const node = layers[0].children[0] as InstanceType<typeof Node>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = node.shape as any;
      expect(s.cx).toBe(50);
      expect(s.cy).toBe(60);
      expect(s.r).toBe(25);
    });

    it('polygon with options', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [
          {
            name: 'l',
            index: 0,
            children: [
              {
                type: 'node',
                shapeType: 'polygon',
                args: [
                  [
                    [0, 0],
                    [100, 0],
                    [50, 80],
                  ],
                ],
                options: ['cardinal', false],
              },
            ],
          },
        ],
      };
      const layers = deserialize(json, cfg);
      const node = layers[0].children[0] as InstanceType<typeof Node>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = node.shape as any;
      expect(s.points).toEqual([
        [0, 0],
        [100, 0],
        [50, 80],
      ]);
      expect(s.curve).toBe('cardinal');
      expect(s.closed).toBe(false);
    });
  });

  describe('Transform 反序列化', () => {
    it('反序列化 translate/rotate/scale', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [
          {
            name: 'l',
            index: 0,
            children: [
              {
                type: 'node',
                shapeType: 'rect',
                args: [0, 0, 100, 50],
                translate: [100, 200],
                rotate: Math.PI / 4,
                scale: [2, 3],
              },
            ],
          },
        ],
      };
      const layers = deserialize(json, cfg);
      const node = layers[0].children[0] as InstanceType<typeof Node>;
      expect(node._translate[0]).toBe(100);
      expect(node._translate[1]).toBe(200);
      expect(node._rotate).toBe(Math.PI / 4);
      expect(node._scale[0]).toBe(2);
      expect(node._scale[1]).toBe(3);
    });

    it('反序列化 z/visible/display/className/data', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [
          {
            name: 'l',
            index: 0,
            children: [
              {
                type: 'node',
                shapeType: 'rect',
                args: [0, 0, 10, 10],
                z: 5,
                visible: false,
                display: false,
                className: 'foo bar',
                data: {x: 1},
              },
            ],
          },
        ],
      };
      const layers = deserialize(json, cfg);
      const node = layers[0].children[0] as InstanceType<typeof Node>;
      expect(node.z).toBe(5);
      expect(node.visible).toBe(false);
      expect(node.display).toBe(false);
      expect(node.className).toBe('foo bar');
      expect(node.data).toEqual({x: 1});
    });
  });

  describe('Group 反序列化', () => {
    it('反序列化 Group 及子节点', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [
          {
            name: 'l',
            index: 0,
            children: [
              {
                type: 'group',
                name: 'g1',
                translate: [10, 20],
                children: [
                  {type: 'node', shapeType: 'rect', args: [0, 0, 50, 30], name: 'r1'},
                  {type: 'node', shapeType: 'circle', args: [25, 15, 10], name: 'c1'},
                ],
              },
            ],
          },
        ],
      };
      const layers = deserialize(json, cfg);
      const group = layers[0].children[0] as InstanceType<typeof Group>;
      expect(group.type).toBe(2);
      expect(group.name).toBe('g1');
      expect(group._translate[0]).toBe(10);
      expect(group._translate[1]).toBe(20);
      expect(group.children.length).toBe(2);
      expect((group.children[0] as InstanceType<typeof Node>).name).toBe('r1');
      expect((group.children[1] as InstanceType<typeof Node>).name).toBe('c1');
    });

    it('反序列化嵌套 Group', () => {
      const json: RendxJSON = {
        version: 1,
        width: 800,
        height: 600,
        layers: [
          {
            name: 'l',
            index: 0,
            children: [
              {
                type: 'group',
                name: 'outer',
                children: [
                  {
                    type: 'group',
                    name: 'inner',
                    children: [{type: 'node', shapeType: 'rect', args: [0, 0, 10, 10]}],
                  },
                ],
              },
            ],
          },
        ],
      };
      const layers = deserialize(json, cfg);
      const outer = layers[0].children[0] as InstanceType<typeof Group>;
      expect(outer.name).toBe('outer');
      const inner = outer.children[0] as InstanceType<typeof Group>;
      expect(inner.name).toBe('inner');
      expect(inner.children.length).toBe(1);
    });
  });
});

describe('Round-trip - 序列化/反序列化往返', () => {
  const cfg = {width: 1024, height: 768};

  it('简单场景往返', () => {
    const layer = new Layer('default', 0, cfg);
    const rect = createRect('r1', 10, 20, 100, 50);
    rect.translate(200, 300);
    rect.rotate(0.5);
    rect.scale(1.5, 2);
    rect.setZ(3);
    rect.data = {tag: 'important'};
    layer.add(rect);

    const circle = createCircle('c1', 50, 60, 25);
    layer.add(circle);

    const json = serialize([layer], cfg.width, cfg.height);
    expect(json.version).toBe(1);
    expect(json.width).toBe(1024);
    expect(json.height).toBe(768);

    const restored = deserialize(json, cfg);
    expect(restored.length).toBe(1);
    expect(restored[0].layerName).toBe('default');
    expect(restored[0].children.length).toBe(2);

    const rn = restored[0].children[0] as InstanceType<typeof Node>;
    expect(rn.name).toBe('r1');
    expect(rn.shapeType).toBe('rect');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rs = rn.shape as any;
    expect(rs.x).toBe(10);
    expect(rs.y).toBe(20);
    expect(rs.width).toBe(100);
    expect(rs.height).toBe(50);
    expect(rn._translate[0]).toBe(200);
    expect(rn._translate[1]).toBe(300);
    expect(rn._rotate).toBeCloseTo(0.5);
    expect(rn._scale[0]).toBe(1.5);
    expect(rn._scale[1]).toBe(2);
    expect(rn.z).toBe(3);
    expect(rn.data).toEqual({tag: 'important'});
    expect(rn.attrs.values.fill).toBe('red');

    const cn = restored[0].children[1] as InstanceType<typeof Node>;
    expect(cn.name).toBe('c1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cs = cn.shape as any;
    expect(cs.cx).toBe(50);
    expect(cs.cy).toBe(60);
    expect(cs.r).toBe(25);
  });

  it('多层场景往返', () => {
    const layer1 = new Layer('bg', 0, cfg);
    layer1.add(createRect('bg-rect', 0, 0, 1024, 768));

    const layer2 = new Layer('fg', 1, cfg);
    layer2.culling = false;
    layer2.add(createText('title'));

    const json = serialize([layer1, layer2], cfg.width, cfg.height);
    expect(json.layers.length).toBe(2);

    const restored = deserialize(json, cfg);
    expect(restored.length).toBe(2);
    expect(restored[0].layerName).toBe('bg');
    expect(restored[1].layerName).toBe('fg');
    expect(restored[1].culling).toBe(false);
  });

  it('Group 嵌套场景往返', () => {
    const layer = new Layer('main', 0, cfg);
    const group = new Group();
    group.setName('panel');
    group.translate(100, 100);
    group.add(createRect('border', 0, 0, 200, 150));
    group.add(createCircle('icon', 100, 75, 20));
    layer.add(group);

    const json = serialize([layer], cfg.width, cfg.height);
    const restored = deserialize(json, cfg);

    const rg = restored[0].children[0] as InstanceType<typeof Group>;
    expect(rg.type).toBe(2);
    expect(rg.name).toBe('panel');
    expect(rg._translate[0]).toBe(100);
    expect(rg._translate[1]).toBe(100);
    expect(rg.children.length).toBe(2);
    expect((rg.children[0] as InstanceType<typeof Node>).name).toBe('border');
    expect((rg.children[1] as InstanceType<typeof Node>).name).toBe('icon');
  });

  it('JSON 可安全序列化为字符串', () => {
    const layer = new Layer('default', 0, cfg);
    layer.add(createRect('r1', 10, 20, 100, 50));
    const json = serialize([layer], cfg.width, cfg.height);
    const str = JSON.stringify(json);
    const parsed = JSON.parse(str) as RendxJSON;
    expect(parsed.version).toBe(1);
    expect(parsed.layers[0].children.length).toBe(1);

    // 从 parsed JSON 反序列化
    const restored = deserialize(parsed, cfg);
    expect(restored[0].children.length).toBe(1);
    const n = restored[0].children[0] as InstanceType<typeof Node>;
    expect(n.name).toBe('r1');
  });
});

describe('App.toJSON / App.fromJSON', () => {
  it('App 序列化和反序列化', () => {
    const app = new App({width: 800, height: 600});
    const defaultLayer = app.getLayer('default')!;
    const rect = createRect('r1', 10, 20, 100, 50);
    defaultLayer.add(rect);

    const json = app.toJSON();
    expect(json.version).toBe(1);
    expect(json.width).toBe(800);
    expect(json.height).toBe(600);
    // 默认层 + 事件层，但事件层不序列化
    expect(json.layers.length).toBe(1);
    expect(json.layers[0].name).toBe('default');

    const app2 = App.fromJSON(json);
    const layer = app2.getLayer('default')!;
    expect(layer).toBeDefined();
    expect(layer.children.length).toBe(1);
    const restored = layer.children[0] as InstanceType<typeof Node>;
    expect(restored.name).toBe('r1');
    expect(restored.shapeType).toBe('rect');
  });

  it('App.fromJSON 支持多层', () => {
    const app = new App({width: 800, height: 600, layers: ['bg', 'fg']});
    app.getLayer('bg')!.add(createRect('bg-r', 0, 0, 800, 600));
    app.getLayer('fg')!.add(createCircle('fg-c', 400, 300, 50));

    const json = app.toJSON();
    const app2 = App.fromJSON(json);
    expect(app2.getLayer('bg')).toBeDefined();
    expect(app2.getLayer('fg')).toBeDefined();
    expect(app2.getLayer('bg')!.children.length).toBe(1);
    expect(app2.getLayer('fg')!.children.length).toBe(1);
  });
});
