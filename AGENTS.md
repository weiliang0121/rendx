# Rendx - 2D 可视化渲染引擎

## 项目概述

Rendx 是一个基于 TypeScript 的 2D 可视化渲染引擎，采用 pnpm monorepo 架构。它提供从底层数学运算、形状生成到完整场景图管理的全栈 2D 渲染能力，同时支持 Canvas2D 和 SVG 两种渲染后端。

## 技术栈

- **语言**: TypeScript 5.9+（strict 模式）
- **构建**: tsup（ESM + CJS 双格式输出 + DTS 生成）
- **编排**: Turborepo（并行构建、缓存）
- **包管理**: pnpm 9.x workspace
- **代码质量**: ESLint 9.x（flat config）、Prettier 3.8
- **提交规范**: commitlint + husky + Conventional Commits
- **版本管理**: Changesets
- **关键依赖**: gl-matrix（矩阵/向量运算）、eventemitter3（事件系统）

## 包架构（依赖层级）

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
├── rendx-connect-plugin    连线交互插件
├── rendx-drag-plugin       拖拽交互插件
├── rendx-graph-plugin      图元素生命周期管理插件
├── rendx-grid-plugin       网格插件
├── rendx-history-plugin    历史记录插件
├── rendx-minimap-plugin    小地图插件
└── rendx-selection-plugin  选框交互插件
```

## 快速上手

```typescript
import {App, Node} from 'rendx-engine';

// 1. 创建引擎
const app = new App({width: 800, height: 600});
app.mount(document.getElementById('container')!);

// 2. 创建图形节点
const circle = Node.create('circle', {fill: '#ff0000', stroke: '#333'});
circle.shape.from(400, 300, 50); // cx, cy, r

const rect = Node.create('rect', {fill: '#0066ff', opacity: 0.8});
rect.shape.from(100, 100, 200, 150); // x, y, width, height

// 3. 添加到场景
app.scene.add(circle);
app.scene.add(rect);

// 4. 渲染
app.render(); // 静态渲染一帧
// 或 app.requestRender(); // 动画循环
```

## 核心设计模式

### 1. 路径即核心 (Path-Centric)

所有几何形状（circle、rect、sector、area 等）最终都通过 `Path` 类生成 SVG 路径字符串。渲染器通过 `path(d: string)` 方法统一消费路径数据。

### 2. 接口驱动的渲染器 (Interface-Driven Renderer)

`IGraphicsRenderer` 接口定义了标准渲染 API（save/restore、transform、drawShape、clipPath、gradient），Canvas 和 SVG 各自实现该接口。

### 3. 场景图模式 (Scene Graph)

`Graphics → Group/Layer → Scene → Node` 层级结构，支持树形遍历、脏标记更新、世界矩阵传播、多 Canvas 分层渲染。

### 4. Transform 动画系统

`GraphicsTransform`（几何变换动画）、`AttributeTransform`（属性动画）、`ClipBoxTransform`（裁剪动画）通过 fluent API 配置 `duration/delay/easing`，在每帧 `tick()` 时进行插值。

### 5. 事件委托系统

模拟 DOM 事件流的三阶段模型（capture → target → bubble），包含 enter/leave/over/out 的模拟事件合成。

## 每个包的详细 API 文档

各包目录下的 `AGENTS.md` 文件包含完整的 API 参考和架构细节：

| 包                     | 文档位置                              |
| ---------------------- | ------------------------------------- |
| rendx-engine           | `packages/engine/AGENTS.md`           |
| rendx-core             | `packages/core/AGENTS.md`             |
| rendx-bounding         | `packages/bounding/AGENTS.md`         |
| rendx-path             | `packages/path/AGENTS.md`             |
| rendx-shape            | `packages/shape/AGENTS.md`            |
| rendx-ease             | `packages/ease/AGENTS.md`             |
| rendx-curve            | `packages/curve/AGENTS.md`            |
| rendx-interpolate      | `packages/interpolate/AGENTS.md`      |
| rendx-canvas           | `packages/canvas/AGENTS.md`           |
| rendx-svg              | `packages/svg/AGENTS.md`              |
| rendx-gradient         | `packages/gradient/AGENTS.md`         |
| rendx-dom              | `packages/dom/AGENTS.md`              |
| rendx-connect-plugin   | `packages/connect-plugin/AGENTS.md`   |
| rendx-drag-plugin      | `packages/drag-plugin/AGENTS.md`      |
| rendx-graph-plugin     | `packages/graph-plugin/AGENTS.md`     |
| rendx-grid-plugin      | `packages/grid-plugin/AGENTS.md`      |
| rendx-history-plugin   | `packages/history-plugin/AGENTS.md`   |
| rendx-minimap-plugin   | `packages/minimap-plugin/AGENTS.md`   |
| rendx-selection-plugin | `packages/selection-plugin/AGENTS.md` |

## 编码规范

### 命名

- 包名：`rendx-<name>`，全小写，无连字符
- 类名：PascalCase（`BoundingBox`、`CircleShape`）
- 函数名：camelCase（`createCircle`、`interpolateColor`）
- 工厂函数：`create` 前缀（`createShape`、`createLine`）
- 私有字段：ES2022 `#` 语法（`#translate`、`#path`）
- 常量：UPPER_SNAKE_CASE（`POINTERENTER`、`DEFAULT_SIZE`）

### 模块组织

- 每个包入口为 `src/main.ts`，通过 `export * from './xxx'` 聚合导出
- 依赖使用 `rendx-` scope 前缀引用同仓库包
- 外部类型导入使用 `import type` 语法
- 不使用 default export

### TypeScript

- 严格模式（strict: true）
- 目标: ES2020
- 模块解析: bundler
- 接口优先于 type alias（对外 API）
- 使用 `interface` 定义选项（`CircleOptions`、`RendererConfig`）

### 构建输出

- 入口: `src/main.ts`
- 输出: `dist/main.js`（ESM）、`dist/main.cjs`（CJS）、`dist/main.d.ts`（类型）
- 外部依赖: 所有 `rendx-*` 包在 tsup 中标记为 external

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm build            # 构建所有包（Turborepo 并行）
pnpm lint             # ESLint 检查
pnpm format           # Prettier 格式化
pnpm test             # 运行测试
pnpm changeset        # 创建变更集
pnpm changeset version  # 更新版本号
```

## 关键类型

```typescript
type GF = (...args: any[]) => any; // 通用函数类型
type AO = {[key: string]: any}; // 通用对象类型
type Point = [number, number]; // 2D 坐标点
type Vec2 = [number, number]; // 2D 向量
type Mat2d = [number, number, number, number, number, number]; // 2D 仿射矩阵
type Size = {width: number; height: number}; // 尺寸
type RGBA = [number, number, number, number]; // 颜色
```

## 开发注意事项

1. **依赖层级**：添加包间依赖时严格遵循层级关系，不可产生循环依赖
2. **外部化**：tsup 配置中所有 `rendx-*` 包均为 external，不会被 bundle 进输出
3. **gl-matrix**：矩阵/向量运算统一使用 gl-matrix，不要引入其他数学库
4. **浏览器 API**：`OffscreenCanvas`、`Path2D`、`requestAnimationFrame` 等 API 不可在 Node.js 环境使用，需注意 SSR 兼容
5. **渲染器无状态**：`IGraphicsRenderer` 实现应保持渲染调用的无副作用性（除 DOM 操作外）
6. **脏标记**：场景图通过 `dirty`/`needUpdate`/`worldMatrixNeedUpdate` 三级脏标记控制更新粒度
