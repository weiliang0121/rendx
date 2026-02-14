import {Graphics} from './core/graphics';
import {Node} from './scene/node';
import {Group} from './scene/group';
import {Layer} from './scene/layer';

import type {AO, GradientOptions, ClipPath} from 'rendx-core';
import type {RendererConfig} from './renderers/renderer';

// ========================
// JSON Schema Types
// ========================

export interface DyeJSON {
  version: 1;
  width: number;
  height: number;
  layers: LayerJSON[];
}

export interface LayerJSON {
  name: string;
  index: number;
  culling?: boolean;
  children: ChildJSON[];
}

export type ChildJSON = NodeJSON | GroupJSON;

export interface GraphicsJSON {
  name?: string;
  className?: string;
  z?: number;
  visible?: boolean;
  display?: boolean;
  translate?: [number, number];
  rotate?: number;
  scale?: [number, number];
  data?: AO;
}

export interface NodeJSON extends GraphicsJSON {
  type: 'node';
  shapeType: string;
  args: unknown[];
  options?: unknown[];
  attrs?: AO;
  gradient?: GradientOptions;
  clipPath?: ClipPath;
}

export interface GroupJSON extends GraphicsJSON {
  type: 'group';
  children: ChildJSON[];
}

// ========================
// Shape property mappings
// ========================

/** 每种 shape 的 from() 参数对应的实例属性名 */
const SHAPE_FROM_KEYS: Record<string, string[]> = {
  text: ['text', 'x', 'y'],
  circle: ['cx', 'cy', 'r'],
  rect: ['x', 'y', 'width', 'height'],
  line: ['x1', 'y1', 'x2', 'y2'],
  path: ['d'],
  curve: ['segments'],
  area: ['upperSegments', 'lowerSegments'],
  polygon: ['points'],
  sector: ['r', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius', 'padAngle'],
  arc: ['r', 'startAngle', 'endAngle', 'radius'],
  symbol: ['r'],
  round: ['x', 'y', 'width', 'height'],
  image: ['src', 'x', 'y', 'width', 'height'],
};

/** 每种 shape 的 options() 参数对应的实例属性名（仅有 options 的 shape） */
const SHAPE_OPTIONS_KEYS: Record<string, string[]> = {
  curve: ['curve', 'closed'],
  area: ['curve'],
  polygon: ['curve', 'closed'],
  sector: ['rc'],
  symbol: ['symbol'],
  round: ['rx', 'ry'],
};

// ========================
// Serialization
// ========================

function serializeGraphicsProps(g: Graphics): GraphicsJSON {
  const json: GraphicsJSON = {};
  if (g.name) json.name = g.name;
  if (g.className) json.className = g.className;
  if (g.z !== 0) json.z = g.z;
  if (!g.visible) json.visible = false;
  if (!g.display) json.display = false;

  const [tx, ty] = g._translate;
  if (tx !== 0 || ty !== 0) json.translate = [tx, ty];
  if (g._rotate !== 0) json.rotate = g._rotate;
  const [sx, sy] = g._scale;
  if (sx !== 1 || sy !== 1) json.scale = [sx, sy];

  if (Object.keys(g.data).length > 0) json.data = {...g.data};
  return json;
}

function serializeNode(node: Node): NodeJSON | null {
  const shapeType = node.shapeType;
  if (!shapeType || shapeType === 'rectBuffer') return null;

  const fromKeys = SHAPE_FROM_KEYS[shapeType];
  if (!fromKeys) return null;

  const args = node.shape.getProps(fromKeys);

  const json: NodeJSON = {
    type: 'node',
    shapeType,
    args,
    ...serializeGraphicsProps(node),
  };

  // Options（仅当存在 options 映射时）
  const optKeys = SHAPE_OPTIONS_KEYS[shapeType];
  if (optKeys) {
    const opts = node.shape.getProps(optKeys);
    if (opts.some(v => v !== undefined)) {
      json.options = opts;
    }
  }

  // Attributes
  const attrKeys = Object.keys(node.attrs.values);
  if (attrKeys.length > 0) {
    json.attrs = {...node.attrs.values};
  }

  // Gradient
  if (node.attrs.gradientOptions) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {id, ...rest} = node.attrs.gradientOptions;
    json.gradient = {...rest} as GradientOptions;
  }

  // ClipPath
  if (node.attrs.clipPath) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {id, ...rest} = node.attrs.clipPath;
    json.clipPath = {...rest} as ClipPath;
  }

  return json;
}

function serializeChild(g: Graphics): ChildJSON | null {
  if (g.type === 3) return serializeNode(g as Node);
  if (g.type === 2) return serializeGroup(g);
  return null;
}

function serializeGroup(g: Graphics): GroupJSON {
  const children: ChildJSON[] = [];
  for (const child of g.children) {
    const c = serializeChild(child);
    if (c) children.push(c);
  }

  return {
    type: 'group',
    ...serializeGraphicsProps(g),
    children,
  };
}

export function serializeLayer(layer: Layer): LayerJSON {
  const json: LayerJSON = {
    name: layer.layerName,
    index: layer.layerIndex,
    children: [],
  };

  if (!layer.culling) json.culling = false;

  for (const child of layer.children) {
    const c = serializeChild(child);
    if (c) json.children.push(c);
  }

  return json;
}

/** 序列化整个 App 场景为 JSON */
export function serialize(layers: Layer[], width: number, height: number): DyeJSON {
  const layerJSONs: LayerJSON[] = [];
  for (const layer of layers) {
    if (layer.isEventLayer) continue;
    layerJSONs.push(serializeLayer(layer));
  }

  return {
    version: 1,
    width,
    height,
    layers: layerJSONs,
  };
}

// ========================
// Deserialization
// ========================

function deserializeGraphicsProps(g: Graphics, json: GraphicsJSON) {
  if (json.name) g.setName(json.name);
  if (json.className) g.setClassName(json.className);
  if (json.z !== undefined) g.setZ(json.z);
  if (json.visible === false) g.setVisible(false);
  if (json.display === false) g.setDisplay(false);
  if (json.translate) g.translate(json.translate[0], json.translate[1]);
  if (json.rotate !== undefined) g.rotate(json.rotate);
  if (json.scale) g.scale(json.scale[0], json.scale[1]);
  if (json.data) g.data = {...json.data};
}

function deserializeNode(json: NodeJSON): Node {
  const node = Node.create(json.shapeType, json.attrs ?? {});
  node.shape.from(...json.args);
  if (json.options) node.shape.options(...json.options);
  if (json.gradient) node.attrs.gradient({...json.gradient});
  if (json.clipPath) node.attrs.clip({...json.clipPath});
  deserializeGraphicsProps(node, json);
  return node;
}

function deserializeChild(json: ChildJSON): Graphics {
  if (json.type === 'node') return deserializeNode(json);
  return deserializeGroup(json);
}

function deserializeGroup(json: GroupJSON): Group {
  const group = new Group();
  deserializeGraphicsProps(group, json);
  for (const child of json.children) {
    group.add(deserializeChild(child));
  }
  return group;
}

/** 从 JSON 反序列化，创建层和节点（不包含 App 实例） */
export function deserialize(json: DyeJSON, cfg: Partial<RendererConfig>): Layer[] {
  const layers: Layer[] = [];
  for (const layerJSON of json.layers) {
    const layer = new Layer(layerJSON.name, layerJSON.index, cfg);
    if (layerJSON.culling === false) layer.culling = false;
    for (const child of layerJSON.children) {
      layer.add(deserializeChild(child));
    }
    layers.push(layer);
  }
  return layers;
}
