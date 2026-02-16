# rendx-drag-plugin

## 0.2.1

### Patch Changes

- [`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa) - 集成 InteractionManager 通道锁
  - 注册 `pointer-exclusive` 通道（优先级 10）
  - 拖拽开始时获取锁，拖拽结束时释放锁
  - 通过 `app.interaction.queryTraits()` 查询元素 draggable 特征

- Updated dependencies [[`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa)]:
  - rendx-engine@0.5.0

## 0.2.0

### Minor Changes

- [`9c1daec`](https://github.com/weiliang0121/rendx/commit/9c1daec1606478b4858967d8e4cc2bff025b74f0) - feat(drag-plugin): 新增拖拽交互插件

  ### 核心能力
  - **拖拽状态机** — idle → pending → dragging，pointerdown 后超过 threshold（默认 3px）才进入拖拽，避免点击误触发
  - **约束系统** — 轴锁定（`axis`）、网格吸附（`grid`）、边界限制（`bounds`），按 axis → grid → bounds 顺序依次应用
  - **多选联动** — 当 `enableGroupDrag: true`（默认）且安装了 selection-plugin 时，拖拽选中集合中的节点将带动所有选中节点一起移动
  - **Escape 取消** — 拖拽中按 Escape 回滚到起始位置，触发 `drag:cancel` 事件
  - **命中委托** — `hitDelegate` 将叶子命中映射为逻辑拖拽目标（Group 场景）
  - **过滤器** — `filter` 控制哪些节点可被拖拽
  - **光标管理** — 拖拽中自动设置 `grabbing`，结束后重置

  ### 插件软感知（无硬依赖）
  - 通过 `app.getPlugin('graph')` 运行时探测 graph-plugin，存在时使用 `element.update({x,y})` 写入位置（自动触发 edge 依赖重绘）
  - 通过 `app.getPlugin('selection')` 运行时探测 selection-plugin，拖拽后主动调用 `refreshOverlay()` 刷新选框 overlay 位置
  - 通过 `app.getState('selection:selected')` 读取选中集合实现多选联动
  - 未安装对应插件时自动降级为纯 engine 模式（`target.translate()` 直接移动）

  ### 事件总线

  | 事件          | 触发时机             |
  | ------------- | -------------------- |
  | `drag:start`  | 移动超过 threshold   |
  | `drag:move`   | 每帧 pointermove     |
  | `drag:end`    | pointerup 完成       |
  | `drag:cancel` | Escape 或 `cancel()` |

  ### State

  | Key             | 类型         |
  | --------------- | ------------ |
  | `drag:dragging` | `boolean`    |
  | `drag:targets`  | `Graphics[]` |

  ### 工具函数
  - `constrainDelta` — 轴约束
  - `snapToGrid` — 网格吸附
  - `clampToBounds` — 边界限制
  - `applyConstraint` — 综合约束

  新增 33 个测试用例覆盖约束计算、拖拽流程、hitDelegate、filter、多选联动、cancel 回滚、dispose 等场景。
