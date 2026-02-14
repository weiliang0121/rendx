# rendx-interpolate

## 概述
插值器集合，支持数值、颜色、向量、矩阵等多种数据类型的平滑过渡。是动画系统和数据映射的核心。

## 依赖层级
Layer 2（依赖 `gl-matrix`、`rendx-core`）

## 文件结构
按数据类型分类：
- `number.ts` — 标量数值操作（`lerp`、`normalize`）
- `color.ts` — 颜色插值（`interpolateColor`、`interpolateColors`）
- `vector.ts` — 向量与角度插值（`slerp`、`interpolateVec2`、`interpolateRotate`）
- `matrix.ts` — 矩阵分解与插值（`decompose`、`interpolateMat2d`）
- `value.ts` — 通用插值分派器（`interpolateValue`）

## 核心 API

### 标量 (`number.ts`)
- `lerp(a, b)` → `(t: number) => number` — 线性插值工厂
- `normalize(a, b)` → `(x: number) => number` — 数值归一化

### 颜色 (`color.ts`)
- `interpolateColor(a, b)` → `(t: number) => string` — 支持 hex 和 rgb 格式，预计算 RGB 差值
- `interpolateColors(colors)` → `(t: number) => string` — 多色分段插值，内置 LRU 缓存（`MAX_CACHE_SIZE = 64`）避免重复创建插值器链

### 向量 (`vector.ts`)
- `slerp(a, b)` → `(t: number) => vec2` — 球面线性插值
- `interpolateVec2(a, b)` → `(t: number) => vec2` — 向量线性插值
- `interpolateRotate(a, b)` → `(t: number) => number` — 最短路径旋转插值

### 矩阵 (`matrix.ts`)
- `decompose(mat2d)` → `{ translation, rotation, scale }` — 仿射矩阵分解为 TRS 分量
- `interpolateMat2d(a, b)` → `(t: number) => mat2d` — 分解后插值（避免剪切）

### 通用 (`value.ts`)
- `interpolateValue(a, b)` → `(t: number) => number | string` — 根据输入类型自动分派：
  - `number, number` → 调用 `lerp`
  - `string, string` → 调用 `interpolateColor`
  - 类型不匹配 → 返回恒定函数 `() => a`

## 设计要点
- 所有插值器均为**工厂模式**：调用返回一个 `(t: number) => value` 闭包
- `t` 范围 `[0, 1]`，0 为起始值，1 为目标值
- `interpolateMat2d` 先分解为 TRS，分别插值后重组（避免矩阵直接线性插值的畸变）
- `normalize(a, b)` 除零保护：`b === a` 时返回 `() => isNaN(d) ? NaN : 0.5`
- 颜色通过正则解析，在 RGB 空间线性插值后输出 hex；内部使用预构建的 256 元素 hex 查找表（`HEX_TABLE`）
- 向量和矩阵插值器预分配输出对象，每次调用复用同一对象（零 GC）

## 命名规范
- 基础标量操作使用简短名称：`lerp`、`normalize`
- 类型化插值器统一 `interpolateX` 前缀：`interpolateColor`、`interpolateVec2`、`interpolateRotate`、`interpolateMat2d`、`interpolateValue`

## 典型用法
```typescript
import { lerp, interpolateColor } from 'rendx-interpolate';

const fn = lerp(0, 100);
fn(0.5); // 50

const color = interpolateColor('#ff0000', '#0000ff');
color(0.5); // '#800080' (紫色)
```

## 已知问题
- 颜色插值仅支持 hex/rgb，不支持 hsl/rgba
