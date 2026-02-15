# graph-plugin TODO

## 已解决

### ~~Graph + History 插件不兼容~~ ✅ 已修复

**问题**：`history-plugin` 基于 `app.toJSON()` 做场景快照实现撤销/重做。但 `graph` 插件的元素数据（`#elements` Map、类型注册、依赖追踪）存储在插件内部，不在场景图中。因此 `restoreFromJSON()` 只恢复了 Group 节点的几何状态，而 graph 的元素注册表、依赖追踪、cleanup 回调等全部丢失。

**解决方案**：采用「统一快照协议」——利用 Plugin 接口已有的 `serialize()` / `deserialize()` 钩子，在 `App.toJSON()` 和 `App.restoreFromJSON()` 中接通插件序列化管线。

**改动点**：

1. **RendxJSON 类型**（`rendx-engine/src/serialization.ts`）：增加 `plugins?: Record<string, Record<string, unknown>>` 字段
2. **App.toJSON()**：遍历插件调用 `serialize()`，收集数据存入 `json.plugins`
3. **App.restoreFromJSON()**：场景恢复后遍历插件调用 `deserialize(data)`
4. **ElementImpl**：增加 `typeName` 字段，记录创建时使用的类型名称
5. **GraphPlugin.serialize()**：导出所有元素的 `{typeName, data, layer, deps}`
6. **GraphPlugin.deserialize()**：清理旧状态、移除静态分组、重建分组、按 node → edge 顺序批量重建元素

**注意事项**：

- 类型定义（render fn）无法序列化，应用层需保证 `register()` 在 `deserialize()` 之前已执行
- 恢复时 render fn 会重新执行，重建与原始状态视觉一致的节点子树
