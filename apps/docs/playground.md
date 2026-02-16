# Playground

Playground 是一个独立的交互式编辑器应用，用于在线体验 Rendx 引擎的所有能力。左侧选择 Demo，右侧实时预览渲染结果。

## 在线体验

**[打开在线 Playground →](https://weiliang0121.github.io/rendx/playground/)**

## 功能特性

| 功能          | 说明                        |
| ------------- | --------------------------- |
| Monaco 编辑器 | 语法高亮、自动补全          |
| 实时预览      | 在右侧面板查看渲染结果      |
| 内置示例      | 左侧边栏选择不同 demo       |
| 控制台        | 底部显示 `console.log` 输出 |
| 可调分割      | 拖拽中间分割条调整比例      |

## Demo 列表

以下是 Playground 内置的所有 Demo，可点击直接跳转到对应示例。

### 基础渲染

| Demo                                                                                                   | 说明                                |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| [基础图形 Basic Shapes](https://weiliang0121.github.io/rendx/playground/?demo=基础图形+Basic+Shapes)   | circle、rect、line、text 等基础图形 |
| [圆角矩形 Round Rect](https://weiliang0121.github.io/rendx/playground/?demo=圆角矩形+Round+Rect)       | 圆角矩形形状                        |
| [虚线样式 Dash Patterns](https://weiliang0121.github.io/rendx/playground/?demo=虚线样式+Dash+Patterns) | strokeDasharray 虚线                |
| [路径图形 Path Shape](https://weiliang0121.github.io/rendx/playground/?demo=路径图形+Path+Shape)       | 自定义 SVG 路径                     |

### 定位与更多图形

| Demo                                                                                       | 说明                       |
| ------------------------------------------------------------------------------------------ | -------------------------- |
| [变换 Transform](https://weiliang0121.github.io/rendx/playground/?demo=变换+Transform)     | translate / rotate / scale |
| [层叠顺序 Z-Index](https://weiliang0121.github.io/rendx/playground/?demo=层叠顺序+Z-Index) | zIndex 控制渲染顺序        |
| [符号图形 Symbol](https://weiliang0121.github.io/rendx/playground/?demo=符号图形+Symbol)   | 内置符号类型               |
| [图片加载 Image](https://weiliang0121.github.io/rendx/playground/?demo=图片加载+Image)     | 图片节点                   |

### 场景图

| Demo                                                                                                     | 说明                                |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| [场景树 Scene Tree](https://weiliang0121.github.io/rendx/playground/?demo=场景树+Scene+Tree)             | Scene → Layer → Group → Node 树结构 |
| [多图层 Multi-Layer](https://weiliang0121.github.io/rendx/playground/?demo=多图层+Multi-Layer)           | 多 Canvas 分层渲染                  |
| [可见性切换 Visibility](https://weiliang0121.github.io/rendx/playground/?demo=可见性切换+Visibility)     | setDisplay / setVisible             |
| [穿透点击 Pointer Events](https://weiliang0121.github.io/rendx/playground/?demo=穿透点击+Pointer+Events) | pointerEvents 控制                  |
| [太阳系 Solar System](https://weiliang0121.github.io/rendx/playground/?demo=太阳系+Solar+System)         | 嵌套 Group 旋转动画                 |

### 事件与交互

| Demo                                                                                                     | 说明                        |
| -------------------------------------------------------------------------------------------------------- | --------------------------- |
| [交互悬停 Hover](https://weiliang0121.github.io/rendx/playground/?demo=交互悬停+Hover)                   | pointerenter / pointerleave |
| [拖拽交互 Drag & Drop](https://weiliang0121.github.io/rendx/playground/?demo=拖拽交互+Drag+%26+Drop)     | pointermove 手动拖拽        |
| [事件冒泡 Event Bubbling](https://weiliang0121.github.io/rendx/playground/?demo=事件冒泡+Event+Bubbling) | capture → target → bubble   |

### 数据可视化图形

| Demo                                                                                                                 | 说明                |
| -------------------------------------------------------------------------------------------------------------------- | ------------------- |
| [扇形与弧 Sector & Arc](https://weiliang0121.github.io/rendx/playground/?demo=扇形与弧+Sector+%26+Arc)               | 扇形、弧形形状      |
| [多边形与曲线 Polygon & Curve](https://weiliang0121.github.io/rendx/playground/?demo=多边形与曲线+Polygon+%26+Curve) | 多边形 + 曲线插值   |
| [面积图 Area Chart](https://weiliang0121.github.io/rendx/playground/?demo=面积图+Area+Chart)                         | area 形状构建面积图 |

### 视觉属性

| Demo                                                                                                   | 说明                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------ |
| [渐变 Gradient](https://weiliang0121.github.io/rendx/playground/?demo=渐变+Gradient)                   | 线性/径向渐变            |
| [静态裁剪 Clip Path](https://weiliang0121.github.io/rendx/playground/?demo=静态裁剪+Clip+Path)         | clipBox 裁剪             |
| [自定义数据 Custom Data](https://weiliang0121.github.io/rendx/playground/?demo=自定义数据+Custom+Data) | node.data 自定义数据挂载 |

### 基础动画

| Demo                                                                                                       | 说明                       |
| ---------------------------------------------------------------------------------------------------------- | -------------------------- |
| [平移动画 Translate](https://weiliang0121.github.io/rendx/playground/?demo=平移动画+Translate)             | useTransform().translate() |
| [旋转动画 Rotate](https://weiliang0121.github.io/rendx/playground/?demo=旋转动画+Rotate)                   | useTransform().rotate()    |
| [属性动画 Attribute](https://weiliang0121.github.io/rendx/playground/?demo=属性动画+Attribute)             | useAttributeTransform()    |
| [缓动函数 Easing Showcase](https://weiliang0121.github.io/rendx/playground/?demo=缓动函数+Easing+Showcase) | 33 种缓动函数对比          |

### 复杂动画

| Demo                                                                                                           | 说明               |
| -------------------------------------------------------------------------------------------------------------- | ------------------ |
| [扇形动画 Sector Animation](https://weiliang0121.github.io/rendx/playground/?demo=扇形动画+Sector+Animation)   | 扇形角度动画       |
| [仪表盘 Arc Gauge](https://weiliang0121.github.io/rendx/playground/?demo=仪表盘+Arc+Gauge)                     | 弧形仪表盘进度动画 |
| [裁剪动画 ClipBox Animation](https://weiliang0121.github.io/rendx/playground/?demo=裁剪动画+ClipBox+Animation) | 裁剪框揭露动效     |

### 引擎特性

| Demo                                                                                                 | 说明              |
| ---------------------------------------------------------------------------------------------------- | ----------------- |
| [序列化 Serialization](https://weiliang0121.github.io/rendx/playground/?demo=序列化+Serialization)   | toJSON / fromJSON |
| [插件系统 Plugin](https://weiliang0121.github.io/rendx/playground/?demo=插件系统+Plugin)             | 自定义插件示例    |
| [随机圆 Random Circles](https://weiliang0121.github.io/rendx/playground/?demo=随机圆+Random+Circles) | 大量节点渲染性能  |

### 插件 Demo

| Demo                                                                                                                   | 说明                      |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [图插件 Graph Plugin](https://weiliang0121.github.io/rendx/playground/?demo=图插件+Graph+Plugin)                       | graph-plugin 基本用法     |
| [元素生命周期 Element Lifecycle](https://weiliang0121.github.io/rendx/playground/?demo=元素生命周期+Element+Lifecycle) | 元素创建/更新/销毁        |
| [元素+历史 Element History](https://weiliang0121.github.io/rendx/playground/?demo=元素%2B历史+Element+History)         | graph + history 集成      |
| [选框插件 Selection Basic](https://weiliang0121.github.io/rendx/playground/?demo=选框插件+Selection+Basic)             | selection-plugin 基本用法 |
| [选框+图集成 Selection Graph](https://weiliang0121.github.io/rendx/playground/?demo=选框%2B图集成+Selection+Graph)     | selection + graph 集成    |
| [拖拽基础 Drag Basic](https://weiliang0121.github.io/rendx/playground/?demo=拖拽基础+Drag+Basic)                       | drag-plugin 基本用法      |
| [拖拽+图集成 Drag Graph](https://weiliang0121.github.io/rendx/playground/?demo=拖拽%2B图集成+Drag+Graph)               | drag + graph 集成         |
| [连线基础 Connect Basic](https://weiliang0121.github.io/rendx/playground/?demo=连线基础+Connect+Basic)                 | connect-plugin 基本用法   |
| [连线+图集成 Connect Graph](https://weiliang0121.github.io/rendx/playground/?demo=连线%2B图集成+Connect+Graph)         | connect + graph 集成      |
| [缩放平移 Zoom Basic](https://weiliang0121.github.io/rendx/playground/?demo=缩放平移+Zoom+Basic)                       | zoom-plugin 基本用法      |

## 本地开发

```bash
# 在仓库根目录
pnpm --filter rendx-playground dev
```

启动后访问 `http://localhost:5174`。
