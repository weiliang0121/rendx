# 架构总览

## 包层级

Rendx 采用严格分层的 monorepo 架构，每一层只能依赖下层包：

```
Layer 0 (零依赖)
├── rendx-core         基础类型定义 + 工具函数集合
├── rendx-bounding     包围盒计算
├── rendx-path         SVG 路径构建器
└── rendx-ease         缓动函数

Layer 1 (仅依赖 Layer 0)
├── rendx-dom          DOM/SVG 元素操作
├── rendx-curve        曲线插值算法

Layer 2 (依赖 Layer 0-1)
├── rendx-interpolate  插值器（数值、颜色、向量、矩阵）
├── rendx-shape        形状生成器
└── rendx-gradient     渐变解析与生成

Layer 3 (依赖 Layer 0-2)
├── rendx-canvas       Canvas2D 渲染器实现
└── rendx-svg          SVG 渲染器实现

Layer 4 (顶层)
└── rendx-engine       场景图引擎（整合所有包）

插件
├── rendx-grid-plugin     网格插件
├── rendx-history-plugin  历史记录插件
└── rendx-minimap-plugin  小地图插件
```

## 渲染管线

```
requestRender() / render()
   ↓
#tick(time)
   ├── scene.tick(time)          → 递归更新 Transform 动画
   ↓
   └── for each layer:
        ├── layer.sign()          → 检查脏标记
        └── layer.draw()
             ├── layer.update()   → 递归更新矩阵树
             ├── layer.getQueue() → 收集叶子节点 → Z 排序
             ├── #cullViewport()  → 视口裁剪 (AABB)
             └── renderer.draw(queue)
                  └── for each node:
                       save → gradient → clipPath → setTransform
                       → setAttributes → DRAW_MAP[command] → restore
```

## 事件管线

```
DOM Event (pointermove/click/wheel)
   ↓
EventObserver
   ├── renderer.position(clientXY) → 画布坐标
   ├── scene.position(offset)      → 场景坐标
   ├── scene.pick(offset)          → 跨层命中检测
   └── EventDispatcher.process(event)
        ├── simulate pointerenter/leave/over/out
        └── flow(event)
             ├── capture: 路径倒序 → emit capture-{type}
             ├── target: emit {type}
             └── bubble: 路径正序 → emit {type}
```

## 关键类型

```typescript
type GF = (...args: any[]) => any;           // 通用函数类型
type AO = { [key: string]: any };            // 通用对象类型
type Point = [number, number];               // 2D 坐标点
type Vec2 = [number, number];                // 2D 向量
type Mat2d = [number, number, number,
              number, number, number];        // 2D 仿射矩阵
type Size = { width: number; height: number }; // 尺寸
type RGBA = [number, number, number, number]; // 颜色
```

## 技术栈

| 维度 | 选型 |
|------|------|
| 语言 | TypeScript 5.9+ (strict) |
| 构建 | tsup (ESM + CJS + DTS) |
| 编排 | Turborepo |
| 包管理 | pnpm 9.x workspace |
| 矩阵运算 | gl-matrix |
| 事件系统 | eventemitter3 |
