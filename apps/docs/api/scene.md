# Scene & Node

## Scene

场景根节点（type=1），管理多个 Layer。

### 层管理

| 方法 | 说明 |
|------|------|
| `registerLayer(layer)` | 注册层 |
| `getLayer(name)` | 按名称获取层 |
| `removeLayer(name)` | 移除层 |

### 节点操作

`add(child)` 默认添加到 `default` 层。

### 交互

| 方法 | 说明 |
|------|------|
| `pick(point)` | 跨层命中检测（从高 layerIndex 向下搜索） |
| `position(point)` | 逆矩阵坐标映射 |
| `getQueue()` | 收集所有层的渲染队列 |

## Node

叶子节点（type=3），场景图中的可渲染单元。

### 工厂方法

```typescript
const node = Node.create('circle', { fill: 'red', stroke: '#000' });
node.shape.from(100, 200, 50); // cx, cy, r
```

`Node.create(type, attrs?)` — 创建指定类型的节点。

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `shape` | `Shape` | 几何形状 |
| `attrs` | `Attributes` | 视觉属性 |
| `shapeType` | `string` | 形状注册名 |

### 命中检测

`hit(point)` — 基于 OffscreenCanvas 的精确命中检测。

## Group

分组容器（type=2），使用方式：

```typescript
import { Group, Node } from 'rendx-engine';

const group = new Group();
group.translate(100, 100);

const child = Node.create('rect', { fill: '#0066ff' });
child.shape.from(0, 0, 50, 30);
group.add(child);

app.scene.add(group);
```

## Layer

分层渲染节点（type=4），继承 Group。

| 属性/方法 | 说明 |
|-----------|------|
| `layerName` | 层名称 |
| `layerIndex` | 层级序号 |
| `renderer` | 独立渲染器 |
| `culling` | 是否启用视口裁剪（默认 true） |
| `getQueue()` | 本层渲染队列 |
| `draw()` | 执行渲染 |
| `resize(size)` | 更新渲染器尺寸 |

## Graphics 基类

所有场景节点的公共基类，继承 `EventTarget`。

### 树操作

`add`, `remove`, `removeChildren`, `unshift`, `find(name)`, `query(path)`, `traverse(fn)`, `path()`, `root`, `has(name, deep?)`, `source(target)`

### 标识

`setName`, `setClassName`, `addClassName`, `hasClassName`, `is(name)`, `equals(target)`

### 可见性

`setVisible(v, bySelf?)`, `setDisplay(d, bySelf?)`, `setPointerEvents(pe, bySelf?)`

### 变换

```typescript
// 增量变换
node.translate(tx, ty);
node.rotate(radian);
node.scale(sx, sy);

// 矩阵设置
node.setMatrix(mat2d);
node.setWorldMatrix(mat2d);

// 只读 getter
node.translation; // [tx, ty]
node.rotation;    // radian
node.scaling;     // [sx, sy]
```

### Z 排序

`setZ(z)`, `getZIndex()`
