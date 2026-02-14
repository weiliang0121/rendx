# Shapes

Rendx 内置 14 种形状，全部通过 `Node.create(type, attrs)` 创建。

## 形状一览

| 类型 | from() 参数 | 说明 |
|------|-------------|------|
| `text` | `(x, y, text)` | 文本 |
| `circle` | `(cx, cy, r)` | 圆形 |
| `rect` | `(x, y, width, height)` | 矩形 |
| `line` | `(x1, y1, x2, y2)` | 线段 |
| `image` | `(src, x, y, width, height)` | 图片 |
| `path` | 自由路径 | 自定义路径 |
| `curve` | 曲线数据 | 曲线 |
| `area` | 面积数据 | 面积图 |
| `polygon` | 多边形数据 | 多边形 |
| `sector` | 扇形参数 | 扇形 |
| `arc` | 弧线参数 | 弧线 |
| `symbol` | 符号参数 | 符号标记 |
| `round` | 圆角矩形参数 | 圆角矩形 |
| `rectBuffer` | 批量矩形 | 批量矩形（性能优化） |

## 使用示例

```typescript
// 圆形
const circle = Node.create('circle', { fill: '#ff0000' });
circle.shape.from(200, 200, 50);

// 矩形
const rect = Node.create('rect', { fill: '#0066ff', opacity: 0.8 });
rect.shape.from(100, 100, 200, 150);

// 文本
const text = Node.create('text', {
  fill: '#333',
  fontSize: 24,
  fontFamily: 'sans-serif'
});
text.shape.from(100, 50, 'Hello Rendx!');

// 线段
const line = Node.create('line', { stroke: '#999', strokeWidth: 2 });
line.shape.from(0, 0, 200, 200);

// 图片
const img = Node.create('image');
img.shape.from('/path/to/image.png', 0, 0, 200, 150);
```

## Shape 基类

所有形状的公共基类，核心 API：

| 方法 | 说明 |
|------|------|
| `from(...args)` | 设置形状参数 |
| `build()` | 构建路径并计算包围盒 |
| `path()` | 返回 SVG 路径字符串 |
| `path2d()` | 返回 Path2D 对象（缓存） |
| `hit(point, attrs)` | 命中检测 |
| `useTransform()` | 启用形状动画 |
| `boundingBox` | 形状包围盒 |
| `dispose()` | 释放资源 |

## Attributes

视觉属性容器，常用属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `fill` | `string` | 填充颜色 |
| `stroke` | `string` | 描边颜色 |
| `opacity` | `number` | 不透明度 |
| `strokeWidth` | `number` | 描边宽度 |
| `fontSize` | `number` | 字号 |
| `fontFamily` | `string` | 字体 |

```typescript
// 设置方式
const node = Node.create('rect', { fill: '#ff0000' }); // 创建时
node.attrs.set('fill', '#00ff00');                      // 单独设置
node.attrs.from({ fill: '#ff0000', opacity: 0.5 });     // 批量设置
node.attrs.merge({ stroke: '#000' });                   // 合并
```
