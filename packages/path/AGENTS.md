# rendx-path

## 概述
SVG 路径字符串构建器。所有几何形状最终通过 `Path` 类生成路径数据（SVG `d` 属性），是形状系统的底层基础设施。

## 依赖层级
Layer 0（零依赖）

## 文件结构
```
src/
├── main.ts    入口，re-export path.ts
└── path.ts    Path 类定义
```

## 核心 API — Path 类

使用私有字段 `#d: string` 直接字符串拼接（`+=`）累积路径命令。V8 引擎对 `+=` 使用 cons string（rope）优化，amortized O(1)，消除了数组分配和 join 的开销。

### 绝对坐标命令（大写）

| 方法 | 签名 | 说明 |
|------|------|------|
| `M` | `(x, y)` | moveTo |
| `L` | `(x, y)` | lineTo |
| `H` | `(x)` | 水平 lineTo |
| `V` | `(y)` | 垂直 lineTo |
| `C` | `(x1, y1, x2, y2, x, y)` | 三次贝塞尔 |
| `Q` | `(x1, y1, x, y)` | 二次贝塞尔 |
| `A` | `(rx, ry, angle, largeArcFlag, sweepFlag, x, y)` | 椭圆弧 |
| `Z` | `()` | closePath |

### 相对坐标命令（小写）

| 方法 | 签名 | 说明 |
|------|------|------|
| `l` | `(x, y)` | 相对 lineTo |
| `h` | `(x)` | 相对水平 lineTo |
| `v` | `(y)` | 相对垂直 lineTo |
| `c` | `(x1, y1, x2, y2, x, y)` | 相对三次贝塞尔 |
| `q` | `(x1, y1, x, y)` | 相对二次贝塞尔 |
| `a` | `(rx, ry, angle, largeArcFlag, sweepFlag, x, y)` | 相对椭圆弧 |

> 注意：没有相对 `m()` 和 `z()` 方法。`M()` 和 `Z()` 仅有大写版本。

### 工具方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `toString()` | `string` | 返回完整路径字符串 |
| `clear()` | `void` | 清空路径（注意：不返回 `this`，不可链式调用） |

## 设计要点
- **链式调用**：所有路径命令方法返回 `this`（`clear()` 除外）
- **输出格式**：命令字母紧接首个数字，参数间空格分隔，末尾有尾随空格，如 `M0 0 L100 0 L100 100 Z `
- **零依赖**：Layer 0 包，不依赖任何其他 `rendx-*` 包
- **Path 注入**：作为 `rendx-shape` 和 `rendx-curve` 的输出载体，形状生成器接收外部 Path 实例写入命令

## 典型用法
```typescript
import { Path } from 'rendx-path';

const path = new Path();
path.M(0, 0).L(100, 0).L(100, 100).Z();
path.toString(); // "M0 0 L100 0 L100 100 Z "
```
