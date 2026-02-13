# @dye/path

## 概述
SVG 路径字符串构建器。所有几何形状最终通过 Path 生成路径数据（d 属性），是形状系统的底层基础设施。

## 依赖层级
Layer 0（零依赖）

## 核心 API

### Path 类
使用私有字段 `#path: string[]` 累积路径命令。

**绝对命令（大写）**：
- `M(x, y)` — moveTo
- `L(x, y)` — lineTo
- `H(x)` — 水平 lineTo
- `V(y)` — 垂直 lineTo
- `C(x1, y1, x2, y2, x, y)` — 三次贝塞尔
- `Q(x1, y1, x, y)` — 二次贝塞尔
- `A(rx, ry, rotation, largeArc, sweep, x, y)` — 椭圆弧
- `Z()` — closePath

**相对命令（小写）**：
- `m(dx, dy)`, `l(dx, dy)`, `h(dx)`, `v(dy)`, `c(...)`, `q(...)`, `a(...)`, `z()`

**工具**：
- `toString()` — 返回完整路径字符串
- `clear()` — 清空路径

## 设计要点
- 所有方法返回 `this`，支持链式调用：`path.M(0,0).L(10,10).Z()`
- 内部使用 `#path` 数组拼接，`toString()` 时 join
- 作为 `@dye/shape` 和 `@dye/curve` 的输出载体

## 典型用法
```typescript
const path = new Path();
path.M(0, 0).L(100, 0).L(100, 100).Z();
path.toString(); // "M 0 0 L 100 0 L 100 100 Z"
```
