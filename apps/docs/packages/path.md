# rendx-path

SVG 路径字符串构建器。所有几何形状最终通过 `Path` 类生成路径数据。

## Path

```typescript
import { Path } from 'rendx-path';

const p = new Path();
p.M(10, 10).L(100, 10).L(100, 100).Z();
console.log(p.toString()); // "M10,10L100,10L100,100Z"
```

### 绝对命令

| 方法 | 说明 |
|------|------|
| `M(x, y)` | 移动到 |
| `L(x, y)` | 直线到 |
| `H(x)` | 水平线 |
| `V(y)` | 垂直线 |
| `C(x1, y1, x2, y2, x, y)` | 三次贝塞尔 |
| `Q(x1, y1, x, y)` | 二次贝塞尔 |
| `A(rx, ry, rot, large, sweep, x, y)` | 弧线 |
| `Z()` | 闭合 |

### 相对命令

`l`, `h`, `v`, `c`, `q`, `a` — 参数相同但基于当前位置的相对偏移。

### 工具

| 方法 | 说明 |
|------|------|
| `toString()` | 输出 SVG 路径字符串 |
| `clear()` | 清空路径 |
