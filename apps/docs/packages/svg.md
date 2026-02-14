# rendx-svg

SVG 渲染器实现，实现 `IGraphicsRenderer` 接口，操作 SVG DOM 元素。

## SvgRenderer

API 与 `CanvasRenderer` 对称：

| 方法 | 说明 |
|------|------|
| `el` | SVG 根元素 (getter) |
| `getSize()` | 返回当前尺寸 |
| `resize(size)` | 调整画布大小 |
| `save(createChild?) / restore()` | 状态栈 |
| `setTransform(a,b,c,d,e,f)` | 设置变换 |
| `setAttributes(attrs)` | 设置样式属性 |
| `rect / circle / line / text / path / image` | 绘制 |
| `clipPath(d)` | 裁剪 |
| `gradient(options)` | 渐变 |
| `clear()` | 清空 |
| `dispose()` | 释放 |
