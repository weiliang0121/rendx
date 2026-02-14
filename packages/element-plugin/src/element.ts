import {Group} from 'rendx-engine';

import type {App, Plugin} from 'rendx-engine';
import type {ElementNodeData, ElementRenderer, ElementUpdater, PortDefinition, RenderResult} from './types';

export interface ElementPluginOptions {
  /** 添加元素时使用的默认图层名（默认 'default'） */
  layerName?: string;
}

/** 内部条目：持有数据快照 + 渲染 Group */
interface ElementEntry {
  data: ElementNodeData;
  group: Group;
}

/**
 * Element 插件 — 图编辑器的元素管理层。
 *
 * 职责：
 * 1. 维护元素注册表（Map<id, ElementNodeData>）
 * 2. 将 ElementNodeData 映射为 rendx Group/Node 树
 * 3. 管理端口（连接锚点）坐标计算
 * 4. 支持自定义元素类型注册
 * 5. 通过中心化 state + bus 通知其他插件
 *
 * @example
 * ```ts
 * import {elementPlugin} from 'rendx-element-plugin';
 *
 * const element = elementPlugin();
 * app.use(element);
 *
 * element.addNode({
 *   id: 'n1', type: 'rect',
 *   x: 100, y: 100, width: 200, height: 80,
 *   label: '处理器',
 *   ports: [{ id: 'in', position: 'left' }, { id: 'out', position: 'right' }],
 * });
 * ```
 */
class ElementPlugin implements Plugin {
  name = 'element';

  state = [
    {
      key: 'element:nodes',
      description: '所有图元素的数据快照（Record<id, ElementNodeData>）',
      initial: {} as Record<string, ElementNodeData>,
    },
  ];

  #app: App | null = null;
  #layerName: string;
  #renderers = new Map<string, ElementRenderer>();
  #updaters = new Map<string, ElementUpdater>();
  #entries = new Map<string, ElementEntry>();

  constructor(options: ElementPluginOptions = {}) {
    this.#layerName = options.layerName ?? 'default';
  }

  install(app: App) {
    this.#app = app;
  }

  // ========================
  // Type Registry
  // ========================

  /**
   * 注册自定义元素类型。
   *
   * @param type - 类型名称（如 'custom-card'）
   * @param renderer - 渲染器函数：ElementNodeData → Group
   * @param updater - 可选更新器：就地更新已有 Group（不提供则 destroy+recreate）
   *
   * @example
   * ```ts
   * element.registerType('card', (data) => {
   *   const group = new Group();
   *   const bg = Node.create('round', { fill: '#fff', stroke: '#ddd' });
   *   bg.shape.from(0, 0, data.width ?? 200, data.height ?? 100);
   *   bg.shape.options(8, 8);
   *   group.add(bg);
   *   return group;
   * });
   * ```
   */
  registerType(type: string, renderer: ElementRenderer, updater?: ElementUpdater) {
    this.#renderers.set(type, renderer);
    if (updater) {
      this.#updaters.set(type, updater);
    }
  }

  // ========================
  // CRUD
  // ========================

  /**
   * 添加元素到场景。
   * @returns 创建的 rendx Group（可用于后续直接操作）
   * @throws id 重复或类型未注册时抛错
   */
  addNode(data: ElementNodeData): Group {
    this.#ensureApp();

    if (this.#entries.has(data.id)) {
      throw new Error(`[element-plugin] Element "${data.id}" already exists.`);
    }

    const renderer = this.#renderers.get(data.type);
    if (!renderer) {
      throw new Error(`[element-plugin] Unknown element type "${data.type}". ` + `Register it via registerType() first.`);
    }

    // Renderer 可返回 Group 或 RenderResult（含自动 height/ports）
    const result = renderer(data);
    const group = this.#extractResult(result, data);
    group.name = data.id;
    group.translate(data.x, data.y);
    // 存储元素数据到 Group.data，方便命中检测时反查
    group.data = {__elementId__: data.id};

    this.#entries.set(data.id, {data: {...data}, group});

    // 添加到目标图层
    const layer = this.#app!.getLayer(this.#layerName);
    if (layer) {
      layer.add(group);
    } else {
      this.#app!.scene.add(group);
    }

    this.#syncState();
    this.#app!.bus.emit('element:added');
    this.#app!.requestRender();

    return group;
  }

  /**
   * 批量添加元素。
   * @returns 创建的 Group 数组
   */
  addNodes(dataList: ElementNodeData[]): Group[] {
    return dataList.map(d => this.addNode(d));
  }

  /**
   * 移除元素。
   * @returns 是否成功移除
   */
  removeNode(id: string): boolean {
    const entry = this.#entries.get(id);
    if (!entry) return false;

    entry.group.parent?.remove(entry.group);
    this.#entries.delete(id);

    this.#syncState();
    this.#app!.bus.emit('element:removed');
    this.#app!.requestRender();

    return true;
  }

  /**
   * 批量移除元素。
   * @returns 成功移除的数量
   */
  removeNodes(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.removeNode(id)) count++;
    }
    return count;
  }

  /**
   * 更新元素属性（增量合并）。
   * - 位置变化直接更新 translate
   * - 类型不变且有 updater 时就地更新
   * - 否则 destroy + recreate
   */
  updateNode(id: string, changes: Partial<ElementNodeData>): void {
    this.#ensureApp();

    const entry = this.#entries.get(id);
    if (!entry) {
      throw new Error(`[element-plugin] Element "${id}" not found.`);
    }

    const oldData = entry.data;
    // id 不可变
    const newData: ElementNodeData = {...oldData, ...changes, id: oldData.id};

    // 位置变化
    if (changes.x !== undefined || changes.y !== undefined) {
      entry.group.translate(newData.x, newData.y);
    }

    const typeChanged = changes.type !== undefined && changes.type !== oldData.type;

    if (!typeChanged) {
      if (this.#hasVisualChanges(changes)) {
        const updater = this.#updaters.get(newData.type);
        if (updater) {
          // 就地更新
          updater(entry.group, newData, changes);
        } else {
          // 无 updater → 重建
          this.#recreate(entry, newData);
        }
      }
    } else {
      // 类型变了 → 必须重建
      this.#recreate(entry, newData);
    }

    entry.data = newData;

    this.#syncState();
    this.#app!.bus.emit('element:updated');
    this.#app!.requestRender();
  }

  // ========================
  // Query
  // ========================

  /** 获取元素数据（只读副本） */
  getNode(id: string): ElementNodeData | undefined {
    const entry = this.#entries.get(id);
    return entry ? {...entry.data} : undefined;
  }

  /** 获取元素的渲染 Group */
  getNodeGroup(id: string): Group | undefined {
    return this.#entries.get(id)?.group;
  }

  /** 获取所有元素 id */
  getNodeIds(): string[] {
    return [...this.#entries.keys()];
  }

  /** 获取所有元素数据 */
  getAllNodes(): ElementNodeData[] {
    return [...this.#entries.values()].map(e => ({...e.data}));
  }

  /** 按类型筛选元素 */
  getNodesByType(type: string): ElementNodeData[] {
    return this.getAllNodes().filter(n => n.type === type);
  }

  /** 元素数量 */
  get count(): number {
    return this.#entries.size;
  }

  /** 是否存在指定元素 */
  hasNode(id: string): boolean {
    return this.#entries.has(id);
  }

  // ========================
  // Port
  // ========================

  /**
   * 计算端口的世界坐标。
   *
   * 坐标基于元素的 x, y, width, height 和端口的 position/offset 计算。
   * @returns [x, y] 世界坐标，端口不存在则返回 null
   */
  getPortPosition(nodeId: string, portId: string): [number, number] | null {
    const entry = this.#entries.get(nodeId);
    if (!entry) return null;

    const port = entry.data.ports?.find(p => p.id === portId);
    if (!port) return null;

    return this.#calcPortPosition(entry.data, port);
  }

  /**
   * 获取元素所有端口及其世界坐标。
   * @returns 端口 id → [x, y] 映射
   */
  getPortPositions(nodeId: string): Record<string, [number, number]> | null {
    const entry = this.#entries.get(nodeId);
    if (!entry || !entry.data.ports) return null;

    const result: Record<string, [number, number]> = {};
    for (const port of entry.data.ports) {
      result[port.id] = this.#calcPortPosition(entry.data, port);
    }
    return result;
  }

  // ========================
  // Persistence
  // ========================

  serialize(): Record<string, unknown> {
    const nodes: Record<string, ElementNodeData> = {};
    for (const [id, entry] of this.#entries) {
      nodes[id] = {...entry.data};
    }
    return {nodes};
  }

  deserialize(data: Record<string, unknown>): void {
    const nodes = data.nodes as Record<string, ElementNodeData> | undefined;
    if (!nodes) return;

    // 清空当前
    for (const id of [...this.#entries.keys()]) {
      this.removeNode(id);
    }

    // 重建
    for (const nodeData of Object.values(nodes)) {
      this.addNode(nodeData);
    }
  }

  dispose(): void {
    for (const entry of this.#entries.values()) {
      entry.group.parent?.remove(entry.group);
    }
    this.#entries.clear();
    this.#renderers.clear();
    this.#updaters.clear();
    this.#app = null;
  }

  // ========================
  // Private
  // ========================

  #ensureApp(): asserts this is {readonly '#app': App} {
    if (!this.#app) {
      throw new Error('[element-plugin] Plugin not installed. Call app.use() first.');
    }
  }

  /** 同步状态快照到中心化 state */
  #syncState(): void {
    const snapshot: Record<string, ElementNodeData> = {};
    for (const [id, entry] of this.#entries) {
      snapshot[id] = {...entry.data};
    }
    this.#app!.setState('element:nodes', snapshot);
  }

  /** 判断变更是否包含视觉相关字段 */
  #hasVisualChanges(changes: Partial<ElementNodeData>): boolean {
    return changes.type !== undefined || changes.width !== undefined || changes.height !== undefined || changes.label !== undefined || changes.style !== undefined || changes.data !== undefined;
  }

  /** 销毁旧 Group，用新 renderer 重建 */
  #recreate(entry: ElementEntry, newData: ElementNodeData): void {
    const renderer = this.#renderers.get(newData.type);
    if (!renderer) {
      throw new Error(`[element-plugin] Unknown element type "${newData.type}".`);
    }

    const parent = entry.group.parent;
    parent?.remove(entry.group);

    const result = renderer(newData);
    const newGroup = this.#extractResult(result, newData);
    newGroup.name = newData.id;
    newGroup.translate(newData.x, newData.y);
    newGroup.data = {__elementId__: newData.id};

    if (parent) parent.add(newGroup);
    entry.group = newGroup;
  }

  /** 从 renderer 结果中提取 Group，并将 RenderResult 中的元数据写回 data */
  #extractResult(result: Group | RenderResult, data: ElementNodeData): Group {
    if (result instanceof Group) {
      return result;
    }
    // RenderResult: 自动填充 height 和 ports
    if (result.height !== undefined) data.height = result.height;
    if (result.ports) data.ports = result.ports;
    return result.group;
  }

  /** 计算单个端口的世界坐标 */
  #calcPortPosition(data: ElementNodeData, port: PortDefinition): [number, number] {
    const {x, y, width = 100, height = 60} = data;
    const offset = port.offset ?? 0.5;

    switch (port.position) {
      case 'top':
        return [x + width * offset, y];
      case 'bottom':
        return [x + width * offset, y + height];
      case 'left':
        return [x, y + height * offset];
      case 'right':
        return [x + width, y + height * offset];
    }
  }
}

/**
 * 创建 Element 插件实例。
 *
 * @example
 * ```ts
 * import {elementPlugin} from 'rendx-element-plugin';
 *
 * const element = elementPlugin();
 * app.use(element);
 *
 * // 注册自定义类型
 * element.registerType('card', (data) => { ... });
 *
 * // 添加元素
 * element.addNode({ id: 'n1', type: 'rect', x: 100, y: 100, width: 200, height: 80 });
 *
 * // 查询
 * const data = element.getNode('n1');
 * const ports = element.getPortPositions('n1');
 *
 * // 更新
 * element.updateNode('n1', { x: 200, label: 'Updated' });
 *
 * // 移除
 * element.removeNode('n1');
 * ```
 */
export function elementPlugin(options?: ElementPluginOptions): ElementPlugin {
  return new ElementPlugin(options);
}

export type {ElementPlugin};
