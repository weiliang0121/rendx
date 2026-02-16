# rendx-graph-plugin

## 0.2.0

### Minor Changes

- [`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa) - 新增 Element Traits 系统
  - `GraphElementTraits` 接口：`draggable` / `selectable` / `connectable` / `deletable` / `positionDerived`
  - `PortResolver`：`connectable` 支持函数形式，返回端口 Graphics 列表
  - `createNode` / `createEdge` 支持 `traits` 配置项，声明元素能力
  - graph-plugin 安装时自动注册 `TraitProvider`，供其他插件通过 `app.interaction.queryTraits()` 查询
  - Node 默认 traits：`{ draggable: true, selectable: true, connectable: true, deletable: true, positionDerived: false }`
  - Edge 默认 traits：`{ draggable: false, selectable: true, connectable: false, deletable: true, positionDerived: true }`

### Patch Changes

- Updated dependencies [[`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa)]:
  - rendx-engine@0.5.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`f1cb892`](https://github.com/weiliang0121/rendx/commit/f1cb892ad9f30e7760b804e886718f15bbdff51f)]:
  - rendx-engine@0.4.0

## 0.1.0

### Minor Changes

- [`c100f35`](https://github.com/weiliang0121/rendx/commit/c100f3508027b5dc8ca97a07276801b34d1a1c62) - 新增图元素生命周期管理插件，提供 Node/Edge 两类元素的类型注册、CRUD 操作、自动分层、依赖追踪和图查询能力：
  - `createNode` / `createEdge` 工厂函数，支持自定义渲染与角色标注
  - `graphPlugin` 插件核心，集成批量操作、依赖追踪、GraphQuery 查询 API
  - Element 基础类与完整类型定义
  - 功能测试与性能基准测试

### Patch Changes

- Updated dependencies [[`c100f35`](https://github.com/weiliang0121/rendx/commit/c100f3508027b5dc8ca97a07276801b34d1a1c62)]:
  - rendx-engine@0.3.0
