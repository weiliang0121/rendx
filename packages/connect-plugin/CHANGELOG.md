# Changelog

## 0.3.0

### Minor Changes

- [`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa) - 集成 InteractionManager 及多项修复
  - 集成 InteractionManager 通道锁，连线开始时获取 `pointer-exclusive` 锁，结束时释放
  - 通过 `app.interaction.queryTraits()` 查询 connectable 端口，替代旧版 className 硬编码
  - 修复 anchor 计算使用局部坐标的 bug，改为世界坐标
  - 修复重复边检测逻辑，正确判断 sourceId/targetId 组合

### Patch Changes

- Updated dependencies [[`069e2a3`](https://github.com/weiliang0121/rendx/commit/069e2a39bc501716c68bf1346dcde0fd805063aa)]:
  - rendx-engine@0.5.0

## 0.2.0

### Minor Changes

- [`ca9c014`](https://github.com/weiliang0121/rendx/commit/ca9c01452ce527aa3cb98044134de0e50a9898e3) - feat: 新增 rendx-connect-plugin 连线交互插件
  - 支持纯引擎模式和 graph-plugin 集成两种边创建路径
  - className 标记可连接端口，吸附检测自动对齐
  - parent chain 自动桥接：从端口 Graphics 溯源 element ID
  - 预览线、Escape 取消、canConnect 过滤、自环控制
  - 与 drag-plugin 互斥：拖拽中不触发连接
  - 32 个测试用例全部通过

### Patch Changes

- Updated dependencies [[`f7a3d1b`](https://github.com/weiliang0121/rendx/commit/f7a3d1ba29eb94cf4dc2b825b0e04d0a74f1eb7f)]:
  - rendx-engine@0.4.1

All notable changes to this project will be documented in this file.
