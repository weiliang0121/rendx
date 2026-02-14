# rendx-ease

## 概述
缓动（easing）函数集合，为动画系统提供非线性时间映射。

## 依赖层级
Layer 0（零依赖）

## 文件结构
- `ease.ts` — 单文件包含所有缓动函数、类型和注册表

## 核心 API

### 类型
- `Ease = (t: number) => number` — 缓动函数签名

### 缓动函数
所有函数签名为 `Ease`，输入输出均在 `[0, 1]` 范围。

| 类别 | In | Out | InOut |
|------|-----|------|-------|
| Linear | `linear` | — | — |
| Quad | `quadIn` | `quadOut` | `quadInOut` |
| Cubic | `cubicIn` | `cubicOut` | `cubicInOut` |
| Quart | `quartIn` | `quartOut` | `quartInOut` |
| Quint | `quintIn` | `quintOut` | `quintInOut` |
| Sine | `sineIn` | `sineOut` | `sineInOut` |
| Exp | `expIn` | `expOut` | `expInOut` |
| Circ | `circIn` | `circOut` | `circInOut` |
| Back | `backIn` | `backOut` | `backInOut` |
| Elastic | `elasticIn` | `elasticOut` | `elasticInOut` |
| Bounce | `bounceIn` | `bounceOut` | `bounceInOut` |

### 工厂函数
- `polyIn(n)` / `polyOut(n)` / `polyInOut(n)` — 可配置指数的多项式缓动

### 注册表
- `easeMap: Record<string, Ease>` — 按名称查找
- `ease(name): Ease` — 名称到函数，找不到返回 `linear`

### 命名规范
- 函数名：`{family}{Direction}`，如 `cubicIn`、`bounceOut`
- Map key：`linear`、`in{Family}`、`out{Family}`、`inOut{Family}`，如 `inCubic`、`outBounce`
- 特化函数（quad/cubic/quart/quint）内联运算，不调用 polyIn

## 设计要点
- Quad/Cubic/Quart/Quint 为内联特化，避免通过 polyIn 函数调用
- 所有 Math 方法解构到模块顶层常量，减少属性查找
- 无中间对象分配
