# @dye/engine 优化项清单

> 基于实际编辑器场景梳理，聚焦核心需求。已完成和已移除的项目保留记录。

---

## 已完成 ✅

### 1. Image / Bitmap 渲染 ✅
### 2. 多 Canvas 分层渲染 ✅
### 3. 视口裁剪 (Viewport Culling) ✅

- `Layer.draw()` 通过 worldBBox 过滤视口外节点
- `Node.getWorldBBox()` 计算世界空间包围盒
- Layer 支持 `culling` 开关（默认 true，Text 层等可关闭）

### 4. 序列化 / 反序列化 ✅

- `app.toJSON()` → 递归导出节点树（shape + attrs + transform 配置）
- `App.fromJSON(json)` → 构建场景图
- 45 个测试覆盖

### 5. 消除 `as any` ✅

- DRAW_MAP 使用具体 Shape 类型断言
- `Shape.getProps(keys)` 替代序列化中的 `as any`

### 6. Text 测量注入 ✅

- `TextShape.defaultMeasure` 静态注入 + 实例 `measure` 属性
- `Shape.setAttrs()` 基类 no-op，TextShape 覆写

### 7. 自动 Resize ✅

- `autoResize: boolean` 配置项
- `mount()` 时启动 `ResizeObserver`，`dispose()` 时清理

### 8. 插件系统 ✅

- `Plugin` 接口：`name / install(app) / resize?(w,h) / dispose?()`
- `App.use(plugin)` 注册，同名去重
- `App.getPlugin(name)` 查询
- `App.dispose()` 自动调用所有插件 `dispose()`
- `App.resize()` 自动调用所有插件 `resize()`
- `App.container` / `App.mounted` getter 供插件访问 DOM
- `@dye/grid-plugin`：点阵网格背景（独立 Canvas，z-index -1）
- `@dye/minimap-plugin`：小地图（缩放绘制节点 + 视口指示器）
- `@dye/history-plugin`：Undo/Redo（基于 `toJSON` 快照）
- `App.restoreFromJSON(json)` 就地恢复场景（供 history 等插件使用）

---

## 已移除 ❌

| 项目 | 原因 |
|------|------|
| 节点级离屏缓存 | 分层已覆盖，OffscreenCanvas 内存/复杂度不值得 |
| 通用批量渲染 | 连续同属性概率低，Canvas API 调用非瓶颈 |
| 阴影 / 滤镜 | 严重影响 Canvas 性能，编辑器不适合，视觉效果建议用 SVG 层 |
| 脏矩形优化 | 连线场景退化为全量重绘，分层已覆盖 |
| Timeline 时间线 | 编排型动画属于演示/motion graphics 领域，编辑器场景不需要 |
| 形状 Morph 动画 | 极小众需求，编辑器里几乎用不到 |
| 复合操作统一 | SVG 端 mix-blend-mode 优先级极低 |
| 无障碍 | 纯编辑器 Canvas 场景优先级极低 |
| 键盘事件 | 编辑器的键盘交互在业务层处理更合适 |

---

## P0 — 高优先级

### 9. 导出 (Export)

- **现状**：`toCanvas()` 已实现
- **目标**：
  - `app.toDataURL(type?, quality?)` → `canvas.toDataURL()`
  - `app.toBlob(callback, type?, quality?)` → `canvas.toBlob()`
  - `app.toSVGString()` → 序列化 SVG DOM 为字符串
- **实现难度**：低（Canvas 端 3 行代码，SVG 端 XMLSerializer）

---

## 快速收益项

| 项目 | 预估工作量 | 价值 |
|------|-----------|------|
| **#9 导出** | 0.5d | 高 — 几行代码即可实现 |

---

*更新时间：2026-02-13*
