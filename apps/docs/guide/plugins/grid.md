# Grid Plugin（网格背景）

**包名**：`rendx-grid-plugin` · [包参考](/packages/grid-plugin)

在画布下方叠加一层独立 Canvas 绘制等间距的圆点网格，常用于编辑器对齐参考。

## 实现方式

Grid Plugin **不使用引擎渲染管线**，而是创建独立的 `<canvas>` 元素插入容器最底层：

- `pointerEvents: 'none'` — 不拦截用户交互
- 支持 `devicePixelRatio`（HiDPI 适配）
- 通过 `zIndex: -1` 确保在所有渲染层下方

## 使用

```typescript
import {gridPlugin} from 'rendx-grid-plugin';

app.use(
  gridPlugin({
    spacing: 20, // 点阵间距（px）
    dotRadius: 1, // 点半径
    color: '#d0d0d0', // 点颜色
  }),
);

// 运行时更新
const grid = app.getPlugin('grid');
grid.update({spacing: 40, color: '#ddd'});

// 窗口resize
grid.resize(newWidth, newHeight);
```
