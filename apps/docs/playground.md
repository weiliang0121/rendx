# Playground

Playground 是一个独立的交互式编辑器应用，用于在线体验 Rendx 引擎。

**[打开在线 Playground →](https://weiliang0121.github.io/rendx/playground/)**

## Graph Editor

基于 Rendx 全部插件能力构建的图编辑器 Demo，展示如何组合 graph / selection / drag / connect / history / grid / minimap 等插件实现完整的可视化编辑器。

**[打开 Graph Editor →](https://weiliang0121.github.io/rendx/playground/editor.html)**

功能特性：

- **拖拽创建** — 从左侧面板拖拽节点到画布
- **连线交互** — 拖拽端口创建贝塞尔曲线连线
- **选中 & 框选** — 点击选中节点/边，Shift 多选，空白拖拽框选
- **撤销重做** — 完整的 Undo/Redo 历史管理
- **缩放平移** — 滚轮缩放，空格 + 拖拽平移
- **小地图** — 右下角缩略视图导航
- **网格背景** — 点阵网格辅助对齐

## 本地开发

```bash
# 在仓库根目录
pnpm --filter rendx-playground dev
```

启动后访问 `http://localhost:5174`（Playground）或 `http://localhost:5174/editor.html`（Graph Editor）。

## 功能

- **Monaco 编辑器** — 语法高亮、自动补全
- **实时预览** — 在右侧面板查看渲染结果
- **内置示例** — 左侧边栏选择不同 demo
- **控制台** — 底部显示 `console.log` 输出
- **可调分割** — 拖拽中间分割条调整比例
