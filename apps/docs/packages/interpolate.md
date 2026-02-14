# rendx-interpolate

插值器集合，支持数值、颜色、向量、矩阵等多种数据类型的平滑过渡。

## 标量插值

```typescript
import { lerp, normalize } from 'rendx-interpolate';

const fn = lerp(0, 100);   // (t) => 0..100
const n = normalize(0, 100); // (x) => 0..1
```

## 颜色插值

```typescript
import { interpolateColor, interpolateColors } from 'rendx-interpolate';

const colorFn = interpolateColor('#ff0000', '#0000ff');
colorFn(0.5); // 中间色
```

## 向量 / 矩阵

| 函数 | 说明 |
|------|------|
| `slerp(a, b)` | 球面线性插值 |
| `interpolateVec2(a, b)` | 2D 向量插值 |
| `interpolateRotate(a, b)` | 旋转插值 |
| `interpolateMat2d(a, b)` | 2D 仿射矩阵插值 |
| `decompose(mat2d)` | 矩阵分解 |

## 通用

`interpolateValue(a, b)` — 自动分派到 `lerp` 或 `interpolateColor`。
