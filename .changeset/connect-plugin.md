---
'rendx-connect-plugin': minor
---

feat: 新增 rendx-connect-plugin 连线交互插件

- 支持纯引擎模式和 graph-plugin 集成两种边创建路径
- className 标记可连接端口，吸附检测自动对齐
- parent chain 自动桥接：从端口 Graphics 溯源 element ID
- 预览线、Escape 取消、canConnect 过滤、自环控制
- 与 drag-plugin 互斥：拖拽中不触发连接
- 32 个测试用例全部通过
