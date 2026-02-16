# Minimap Plugin TODO

## 元素可见性过滤

需要支持配置哪些元素在小地图中显示、哪些不显示。

### 场景

- 辅助图形（连线预览、选框、网格）不应出现在小地图中
- 用户可能希望隐藏某些类型的节点或边
- graph-plugin 的 element 可通过 trait 或 type 过滤

### 可能方案

1. **在 minimap-plugin 中提供 `filter` 选项**：`filter: (graphics) => boolean`，渲染前过滤
2. **在 graph-plugin 中为 element 增加 `visible-in-minimap` trait**：minimap 查询 trait 决定是否渲染
3. **按 Layer 过滤**：minimap 只渲染指定 Layer（如 `default`），跳过 `selection`、`grid` 等辅助层

### 备注

- 具体实现位置待定（可能在 graph-plugin 或 minimap-plugin）
- 优先考虑与现有 trait 系统兼容的方案
