# rendx-core

基础类型定义 + 工具函数集合（Layer 0，零依赖）。

## 类型

```typescript
type GF = (...args: any[]) => any;
type AO = { [key: string]: any };
type Point = [number, number];
type Vec2 = [number, number];
type Vec3 = [number, number, number];
type Mat2d = [number, number, number, number, number, number];
type Size = { width: number; height: number };
type RGBA = [number, number, number, number];
type RGB = [number, number, number];
```

## 类型守卫

`isNum`, `isArr`, `isStr`, `isBool`, `isObj`, `isFunc`, `isUndef`, `isNull`, `isNil`, `isNone`, `isNaN`, `isEmpty`, `isHTMLElement`

## 数组工具

`count`, `min`, `max`, `minBy`, `maxBy`, `sum`, `mean`, `extent`, `extentBy`, `range`, `uniqueArray`, `ascending`, `descending`, `quantile`, `median`

## 数学工具

| 函数 | 说明 |
|------|------|
| `r2d(radian)` | 弧度 → 角度 |
| `d2r(degree)` | 角度 → 弧度 |
| `normalizeRadian` | 归一化弧度 |
| `calcCenter` | 计算中心点 |
| `inRange` | 数值范围检查 |
| `clamper` | 创建钳位函数 |

## 刻度计算

`ticks`, `tickStep`, `tickIncrement`, `nice`, `niceForce`

## 工具函数

| 函数 | 说明 |
|------|------|
| `uid()` / `uid8()` | 生成唯一标识 |
| `compose(...fns)` | 函数组合 |
| `debounce(fn, ms)` | 防抖 |
| `throttle(fn, ms)` | 节流 |
| `defaultsDeep(target, ...sources)` | 深度默认值合并 |
| `groupBy(arr, fn)` | 分组 |

## 接口

`IGraphicsRenderer` — 渲染器统一接口（save / restore / setTransform / rect / circle / line / text / path / image / clipPath / gradient）
