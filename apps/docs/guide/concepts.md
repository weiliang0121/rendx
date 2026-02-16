# 核心概念

## 场景图（Scene Graph）

Rendx 使用树形场景图来组织 2D 图形。所有节点继承自 `Graphics` 基类：

```
Scene (type=1, 场景根节点)
  └── Layer (type=4, 分层渲染节点)
       ├── Group (type=2, 分组容器)
       │    └── Node (type=3, 叶子节点)
       │         ├── Shape (几何形状)
       │         └── Attributes (视觉属性)
       └── Node (type=3)
```

每个节点会维护：

- **localMatrix** — 本地仿射变换矩阵
- **worldMatrix** — 世界变换矩阵（localMatrix × parentWorldMatrix）
- **脏标记** — 三级标记控制更新粒度

## 路径即核心（Path-Centric）

所有几何形状（circle、rect、sector、area 等）最终都通过 `Path` 类生成 SVG 路径字符串，渲染器通过 `path(d: string)` 方法统一消费路径数据。

```typescript
import {Path} from 'rendx-path';

const p = new Path();
p.M(10, 10).L(100, 10).L(100, 100).Z();
console.log(p.toString()); // "M10,10L100,10L100,100Z"
```

## 脏标记系统

场景图通过三级脏标记控制更新粒度：

| 标记                    | 作用                                      |
| ----------------------- | ----------------------------------------- |
| `dirty`                 | 结构变化（添加/移除子节点），向上传播到根 |
| `needUpdate`            | 局部矩阵变化（translate/rotate/scale）    |
| `worldMatrixNeedUpdate` | 世界矩阵需要重新计算                      |

只有标记为脏的节点和层才会参与当前帧的重绘，从而实现按需渲染。

## 双渲染器架构

`IGraphicsRenderer` 接口定义了标准渲染 API：

| 方法                               | 说明              |
| ---------------------------------- | ----------------- |
| `save() / restore()`               | 保存/恢复渲染状态 |
| `setTransform()`                   | 设置变换矩阵      |
| `setAttributes()`                  | 设置视觉属性      |
| `rect/circle/line/text/path/image` | 绘制命令          |
| `clipPath()`                       | 裁剪路径          |
| `gradient()`                       | 渐变填充          |

Canvas2D（`rendx-canvas`）和 SVG（`rendx-svg`）各自实现该接口，上层代码不需关心渲染后端。

## 动画系统

动画通过 Transform 类实现，状态机驱动：

```
start → init → waiting →[elapsed ≥ delay]→ running →[elapsed > delay + duration]→ last
```

- `GraphicsTransform` — 几何变换动画（translate / rotate / scale）
- `AttributeTransform` — 属性动画（opacity / fill / stroke）
- `ClipBoxTransform` — 裁剪框动画

所有 Transform 通过 fluent API 配置：

```typescript
node.useTransform().translate(100, 0).rotate(Math.PI).duration(1000).delay(500).easing('elasticOut').repeat(true);
```

## 事件系统

模拟 DOM 事件流的三阶段模型：

1. **Capture**（捕获）— 从根节点到目标节点
2. **Target**（目标）— 目标节点
3. **Bubble**（冒泡）— 从目标节点回到根节点

支持的事件类型：

- `click`, `pointerdown`, `pointerup`, `pointermove`
- `pointerenter`, `pointerleave`, `pointerover`, `pointerout`（模拟合成）
- `wheel`

## 插件系统

Rendx 通过 `Plugin` 接口提供可插拔的功能扩展。插件不创造新的概念层，而是在引擎原生 API 之上**约束代码组织边界**：

```typescript
interface Plugin {
  name: string;
  state?: PluginStateDeclaration[]; // 声明管理的 state keys
  layers?: PluginLayerDeclaration[]; // 声明需要的渲染层
  install(app: App): void;
  resize?(width: number, height: number): void;
  serialize?(): Record<string, unknown>;
  deserialize?(data: Record<string, unknown>): void;
  dispose?(): void;
}

// 安装
app.use(myPlugin);

// 获取
const plugin = app.getPlugin('name');
```

插件可通过 `state` 声明自己管理的状态 key（`app.setState` / `app.getState` 读写），通过 `layers` 声明需要的渲染层（App 自动创建/复用），通过 `app.bus` 事件总线实现插件间通信。

### 内置插件

| 插件             | 包名                     | 用途                                                 |
| ---------------- | ------------------------ | ---------------------------------------------------- |
| Graph Plugin     | `rendx-graph-plugin`     | Node/Edge 生命周期管理、类型注册、依赖追踪、自动分层 |
| Selection Plugin | `rendx-selection-plugin` | 点击选中、框选、悬停高亮、命中委托                   |
| Drag Plugin      | `rendx-drag-plugin`      | 拖拽移动、约束系统、多选联动、插件软感知             |
| Connect Plugin   | `rendx-connect-plugin`   | 连线交互、端口吸附、预览线、双模式边创建             |
| Grid Plugin      | `rendx-grid-plugin`      | 点阵网格背景                                         |
| History Plugin   | `rendx-history-plugin`   | 基于场景快照的撤销/重做                              |
| Minimap Plugin   | `rendx-minimap-plugin`   | 缩略导航小地图                                       |
| Zoom Plugin      | `rendx-zoom-plugin`      | 画布缩放平移、焦点缩放、视口适应                     |

> 插件之间无硬依赖，可按需组合。详细用法请参阅 [插件指南](./plugins)。
