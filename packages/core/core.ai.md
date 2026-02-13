# @dye/core

> 基础类型定义 + 工具函数集合（合并原 @dye/types 和 @dye/util）

## 职责

- 定义全局基础类型：`GF`、`AO`、`Point`、`Vec2`、`Vec3`、`Mat2d`、`Size`、`RGBA`、`RGB`
- 提供类型守卫与判断函数：`isArr`、`isNum`、`isStr`、`isNil`、`isObj`、`isFunc`、`isUndef`、`isNone` 等
- 提供数组工具：`ascending`、`descending`、`extent`、`ticks`、`nice`、`uniqueArray`、`flatten`、`range` 等
- 提供数学工具：`clamp`、`lerp`、`round`、`toRadian`、`toDegree`、`epsilon` 等
- 提供对象工具：`defaultsDeep`、`defaults`、`omit`、`pick` 等
- 提供字符串工具：`capitalize`、`lowercase`、`uppercase`、`uid8` 等
- 提供函数工具：`identity`、`constant`、`noop`
- 提供二分查找：`Bisector`
- 提供分箱：`Bin`
- 提供快速选择：`quickselect`
- 提供排序：`quickSort`

## 依赖

无外部依赖（Layer 0）

## 源码结构

| 文件 | 说明 |
|------|------|
| `types.ts` | 基础类型定义 |
| `normal.ts` | 类型守卫与判断函数 |
| `array.ts` | 数组操作工具 |
| `math.ts` | 数学计算工具 |
| `object.ts` | 对象操作工具 |
| `function.ts` | 函数工具 |
| `string.ts` | 字符串工具 |
| `number.ts` | 数值格式化 |
| `bisector.ts` | 二分查找器 |
| `bin.ts` | 分箱器 |
| `quick-select.ts` | 快速选择算法 |
| `sort.ts` | 快速排序 |

## 注意事项

- 所有工具函数均为纯函数，无副作用
- 本包为 monorepo 中几乎所有包的底层依赖
- 导出的类型为 `type` 导出，不会增加运行时包体积
