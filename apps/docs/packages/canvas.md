# rendx-canvas

Canvas2D 渲染器实现，实现 `IGraphicsRenderer` 接口。

## CanvasRenderer

```typescript
import { CanvasRenderer } from 'rendx-canvas';

const renderer = new CanvasRenderer({ width: 800, height: 600 });
document.body.appendChild(renderer.el);
```

### 生命周期

| 方法 | 说明 |
|------|------|
| `el` | Canvas DOM 元素 (getter) |
| `getSize()` | 返回当前尺寸 |
| `resize(size)` | 调整画布大小 |
| `clear()` | 清除画布内容 |
| `dispose()` | 释放资源 |

### 渲染

| 方法 | 说明 |
|------|------|
| `save() / restore()` | 状态栈 |
| `setTransform(a,b,c,d,e,f)` | 设置变换矩阵 |
| `setAttributes(attrs)` | 设置视觉属性 |
| `rect / circle / line / text / path / image` | 绘制命令 |
| `clipPath(d)` | 裁剪路径 |
| `gradient(options)` | 渐变填充 |
