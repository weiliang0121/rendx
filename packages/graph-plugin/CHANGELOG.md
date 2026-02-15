# rendx-graph-plugin

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
