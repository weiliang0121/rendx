# element-plugin TODO

## Graph + History 插件兼容性

**问题**：`history-plugin` 基于 `app.toJSON()` / `app.restoreFromJSON()` 做场景图快照来实现撤销重做。但 `graph-plugin` 的 element 数据（`#elements` Map、依赖关系 `#dependents`、类型注册 `#defs`）不在场景图中，不会被序列化。

这意味着：

- `history.push()` 保存的快照不包含 graph 的 element 数据
- `history.undo()` 恢复场景图后，graph 的状态与场景图不一致
- element 的 Group 已被 restoreFromJSON 替换，但 graph 还持有旧引用

**需要解决**：

1. graph-plugin 实现 `serialize()` / `deserialize()` 接口（Plugin 接口已预留）
2. 或者 history-plugin 在 push/undo/redo 时通过 bus 通知 graph-plugin 同步快照
3. 或者 graph-plugin 提供独立的 `toJSON()` / `fromJSON()` 方法，history-plugin 扩展为同时保存场景图 + graph 数据
