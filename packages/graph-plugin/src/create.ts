import type {NodeBase, EdgeBase, NodeDef, EdgeDef, NodeRenderFn, EdgeRenderFn, GraphElementTraits} from './types';

/** createNode 的选项 */
export interface CreateNodeOptions<T extends NodeBase = NodeBase> {
  render: NodeRenderFn<T>;
  traits?: GraphElementTraits;
}

/** createEdge 的选项 */
export interface CreateEdgeOptions<T extends EdgeBase = EdgeBase> {
  render: EdgeRenderFn<T>;
  traits?: GraphElementTraits;
}

/**
 * 定义一个 Node 类型的元素。
 *
 * Node 是有位置 (x, y) 的实体，render fn 接收 NodeContext（group + width/height）。
 * 框架会自动为 Node 设置 group.translate(x, y)，仅位移变化时跳过子树重建。
 *
 * 支持两种调用方式：
 * - `createNode(renderFn)` — 仅传入 render 函数（向后兼容）
 * - `createNode({ render, traits })` — 传入选项对象，可声明特征
 */
export function createNode<T extends NodeBase = NodeBase>(renderOrOptions: NodeRenderFn<T> | CreateNodeOptions<T>): NodeDef<T> {
  if (typeof renderOrOptions === 'function') {
    return {
      __element_def__: true,
      role: 'node',
      render: renderOrOptions,
    };
  }
  return {
    __element_def__: true,
    role: 'node',
    render: renderOrOptions.render,
    traits: renderOrOptions.traits,
  };
}

/**
 * 定义一个 Edge 类型的元素。
 *
 * Edge 连接两个 Node（source → target），render fn 接收 EdgeContext（group + source/target 实例）。
 * 框架自动从 source/target 派生 deps 和 layer='edges'。
 * Edge 的 group 不设置 translate — 由 render fn 自行计算坐标。
 *
 * 支持两种调用方式：
 * - `createEdge(renderFn)` — 仅传入 render 函数（向后兼容）
 * - `createEdge({ render, traits })` — 传入选项对象，可声明特征
 */
export function createEdge<T extends EdgeBase = EdgeBase>(renderOrOptions: EdgeRenderFn<T> | CreateEdgeOptions<T>): EdgeDef<T> {
  if (typeof renderOrOptions === 'function') {
    return {
      __element_def__: true,
      role: 'edge',
      render: renderOrOptions,
    };
  }
  return {
    __element_def__: true,
    role: 'edge',
    render: renderOrOptions.render,
    traits: renderOrOptions.traits,
  };
}
