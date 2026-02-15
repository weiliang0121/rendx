---
'rendx-graph-plugin': minor
---

新增图元素生命周期管理插件，提供 Node/Edge 两类元素的类型注册、CRUD 操作、自动分层、依赖追踪和图查询能力：

- `createNode` / `createEdge` 工厂函数，支持自定义渲染与角色标注
- `graphPlugin` 插件核心，集成批量操作、依赖追踪、GraphQuery 查询 API
- Element 基础类与完整类型定义
- 功能测试与性能基准测试
