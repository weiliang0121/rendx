# rendx-ease

缓动函数集合，为动画系统提供非线性时间映射。

## 类型

```typescript
type Ease = (t: number) => number;
```

## 缓动函数（33 个）

| 族 | In | Out | InOut |
|----|-----|------|-------|
| quad | `quadIn` | `quadOut` | `quadInOut` |
| cubic | `cubicIn` | `cubicOut` | `cubicInOut` |
| quart | `quartIn` | `quartOut` | `quartInOut` |
| quint | `quintIn` | `quintOut` | `quintInOut` |
| sine | `sineIn` | `sineOut` | `sineInOut` |
| exp | `expIn` | `expOut` | `expInOut` |
| circ | `circIn` | `circOut` | `circInOut` |
| back | `backIn` | `backOut` | `backInOut` |
| elastic | `elasticIn` | `elasticOut` | `elasticInOut` |
| bounce | `bounceIn` | `bounceOut` | `bounceInOut` |

特殊：`linear`, `polyIn(n)`, `polyOut(n)`, `polyInOut(n)`

## 注册表

```typescript
import { ease, easeMap } from 'rendx-ease';

const fn = ease('cubicInOut'); // (t: number) => number
```
