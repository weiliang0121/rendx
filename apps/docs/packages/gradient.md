# rendx-gradient

渐变效果的解析与创建，支持 Canvas 和 SVG 两种输出。

## DSL 格式

```
线性渐变: l(id, [x0,y0,x1,y1], [[offset,color]...])
径向渐变: r(id, [cx,cy,r0,cx,cy,r1], [[offset,color]...])
```

## API

| 函数 | 说明 |
|------|------|
| `createCanvasGradient(ctx, options)` | 创建 Canvas 渐变对象 |
| `createSVGGradient(options)` | 创建 SVG 渐变元素 |

内部使用 LRU 缓存（最大 32 条）。
