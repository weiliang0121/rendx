# @dye/curve

## 概述
曲线插值算法集合，用于将离散数据点平滑地连接为路径。是折线图、面积图等可视化图表的核心。

## 依赖层级
Layer 1（依赖 `@dye/path`）

## 文件结构
- `curve.ts` — 单文件包含所有曲线函数、类型和注册表

## 核心 API

### 类型
- `Curve = (path: Path, points: [number, number][], start?: boolean) => void`

### 曲线函数

| 曲线 | 名称 | 说明 |
|------|------|------|
| `linear` | 直线 | 点间直线连接 |
| `step` | 阶梯（中点） | 在中点切换 |
| `stepBefore` | 阶梯（前） | y 先变 |
| `stepAfter` | 阶梯（后） | x 先变 |
| `bumpX` | S 形（X 轴） | X 方向贝塞尔平滑 |
| `bumpY` | S 形（Y 轴） | Y 方向贝塞尔平滑 |
| `natural` | 自然三次样条 | 三对角矩阵求解 |
| `monotoneX` | X 单调保持 | 不引入虚假极值 |
| `monotoneY` | Y 单调保持 | 不引入虚假极值 |
| `basis` | B-样条 | 二阶连续近似 |
| `cardinal(tension)` | 张力曲线 | 可调张力参数（默认 0） |
| `catmullRom(alpha)` | Catmull-Rom | 可调 alpha（默认 0.5） |

### 注册表
```typescript
curveMap: Record<string, Curve>
```
key: `linear`, `natural`, `basis`, `bump-x`, `bump-y`, `monotone-x`, `monotone-y`, `step`, `step-before`, `step-after`, `cardinal`, `catmull-rom`

## 命名规范
- 函数名简洁：`linear`, `bumpX`, `monotoneX`（不加 `createCurve` 前缀）
- Map key 用连字符分隔：`bump-x`, `monotone-x`, `step-before`

## 设计要点
- 所有曲线函数签名统一，`start` 控制是否执行首个 `M` 命令（面积图下边界不需要）
- `natural` 用 `new Array<number>()` 预分配，避免 `map` 创建中间数组
- `monotoneX/Y` 预计算所有斜率数组，单次遍历生成路径（原实现每段冗余判断 orient）
- `step` 系列拆分为独立函数，消除循环内字符串分支
- `cardinal` 和 `catmullRom` 为工厂函数，curveMap 中使用默认参数实例
