# rendx-curve

曲线插值算法集合，将离散数据点平滑地连接为路径。

## 类型

```typescript
type Curve = (path: Path, points: [number, number][], start?: boolean) => void;
```

## 曲线函数

| 函数 | 说明 |
|------|------|
| `linear` | 线性连接 |
| `step` | 阶梯 |
| `stepBefore` | 前置阶梯 |
| `stepAfter` | 后置阶梯 |
| `bumpX` | X 方向凸起 |
| `bumpY` | Y 方向凸起 |
| `natural` | 自然样条 |
| `monotoneX` | X 单调三次 |
| `monotoneY` | Y 单调三次 |
| `basis` | B 样条 |
| `cardinal(tension)` | Cardinal 样条 |
| `catmullRom(alpha)` | Catmull-Rom 样条 |

## 注册表

```typescript
import { curveMap } from 'rendx-curve';
```
