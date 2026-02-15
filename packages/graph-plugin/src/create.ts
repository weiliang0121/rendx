import type {NodeBase, EdgeBase, NodeDef, EdgeDef, NodeRenderFn, EdgeRenderFn} from './types';

/**
 * 定义一个 Node 类型的元素。
 *
 * Node 是有位置 (x, y) 的实体，render fn 接收 NodeContext（group + width/height）。
 * 框架会自动为 Node 设置 group.translate(x, y)，仅位移变化时跳过子树重建。
 */
export function createNode<T extends NodeBase = NodeBase>(render: NodeRenderFn<T>): NodeDef<T> {
  return {
    __element_def__: true,
    role: 'node',
    render,
  };
}

/**
 * 定义一个 Edge 类型的元素。
 *
 * Edge 连接两个 Node（source → target），render fn 接收 EdgeContext（group + source/target 实例）。
 * 框架自动从 source/target 派生 deps 和 layer='edges'。
 * Edge 的 group 不设置 translate — 由 render fn 自行计算坐标。
 */
export function createEdge<T extends EdgeBase = EdgeBase>(render: EdgeRenderFn<T>): EdgeDef<T> {
  return {
    __element_def__: true,
    role: 'edge',
    render,
  };
}
