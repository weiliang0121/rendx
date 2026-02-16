# rendx-selection-plugin

## 0.2.2

### Patch Changes

- [`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa) - 集成 InteractionManager 通道锁
  - 注册 `pointer-exclusive` 通道（优先级 5）
  - 在 click/hover/marquee 事件入口检查通道锁状态，被其他插件锁定时跳过处理
  - 保留 state 软感知作为向后兼容 fallback

- Updated dependencies [[`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa)]:
  - rendx-engine@0.5.0

## 0.2.1

### Patch Changes

- [`9c1daec`](https://github.com/weiliang0121/rendx/commit/9c1daec1606478b4858967d8e4cc2bff025b74f0) - feat(selection-plugin): 新增 `refreshOverlay()` 公开方法
  - 新增 `refreshOverlay()` 方法，暴露内部选框 overlay 刷新能力
  - 供外部插件（如 drag-plugin）在移动节点后主动调用，确保选中框/悬停框与节点位置同步
  - 遵循「谁改谁通知」原则：drag-plugin 作为位置修改方，主动通知 selection-plugin 刷新

## 0.2.0

### Minor Changes

- [`f1cb892`](https://github.com/weiliang0121/rendx/commit/f1cb892ad9f30e7760b804e886718f15bbdff51f) - feat(selection-plugin): 新增光标样式管理和 renderOverlay 自定义覆盖层

  ### 光标样式
  - 悬停到可选节点时自动设置 `pointer` 光标
  - 框选拖拽中设置 `crosshair` 光标
  - 离开节点/框选结束/dispose 时自动重置光标
  - 通过 `app.setCursor()` / `app.resetCursor()` 统一管理

  ### renderOverlay
  - 新增 `renderOverlay` 配置项，支持自定义选中/悬停覆盖层渲染
  - 默认绘制虚线矩形（基于 worldBBox），可返回自定义 Node（如路径描边）
  - 适配路径类节点（曲线边）的选中效果

  新增 5 个光标样式测试用例

### Patch Changes

- Updated dependencies [[`f1cb892`](https://github.com/weiliang0121/rendx/commit/f1cb892ad9f30e7760b804e886718f15bbdff51f)]:
  - rendx-engine@0.4.0
