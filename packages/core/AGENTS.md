# rendx-core

> 基础类型定义 + 工具函数集合（Layer 0，零依赖）

## 源码结构

```
src/
├── main.ts              # 入口：export * from './types', './guards', './helpers'
├── types/
│   ├── index.ts          # 聚合导出
│   ├── base.ts           # 基础类型：GF, AO, Point, Vec2, Vec3, Mat2d, Size, RGBA, RGB
│   ├── gradient.ts       # 渐变类型：GradientType, GradientStops, GradientOptions
│   └── renderer.ts       # 渲染器接口：ClipPath, IGraphicsRenderer
├── guards/
│   ├── index.ts
│   └── is.ts             # 15 个类型守卫函数
└── helpers/
    ├── index.ts           # 聚合导出 11 个模块
    ├── array.ts           # 数组统计与操作
    ├── ticks.ts           # 刻度计算
    ├── math.ts            # 数学工具与常量
    ├── number.ts          # 数值格式化
    ├── string.ts          # 字符串转换
    ├── object.ts          # 对象操作
    ├── function.ts        # 函数工具
    ├── bisector.ts        # 二分查找器
    ├── bin.ts             # 分箱器
    ├── quick-select.ts    # 快速选择算法
    └── sort.ts            # 快速排序
```

## 类型定义 (`types/`)

### 基础类型 (`base.ts`)

| 类型 | 定义 | 说明 |
|------|------|------|
| `GF` | `(...args: any[]) => any` | 通用函数类型 |
| `AO` | `{ [key: string]: any }` | 通用对象类型 |
| `Point` | `[number, number]` | 二维点 |
| `Vec2` | `[number, number]` | 二维向量 |
| `Vec3` | `[number, number, number]` | 三维向量 |
| `Mat2d` | `[number, number, number, number, number, number]` | 2D 仿射矩阵 |
| `Size` | `{ width: number; height: number }` | 宽高对象 |
| `RGBA` | `[number, number, number, number]` | RGBA 颜色 |
| `RGB` | `[number, number, number]` | RGB 颜色 |

### 渐变类型 (`gradient.ts`)

| 类型 | 说明 |
|------|------|
| `GradientType` | `'linear' \| 'radial'` |
| `GradientStops` | `[number, string][]` — 色标数组 |
| `GradientOptions` | `{ id, type, direction, stops, region? }` — 渐变配置 |

### 渲染器接口 (`renderer.ts`)

| 类型 | 说明 |
|------|------|
| `ClipPath` | `{ id: string; path: string }` — 裁剪路径 |
| `IGraphicsRenderer` | Canvas2D / SVG 渲染器统一接口 |

`IGraphicsRenderer` 方法：

| 方法 | 签名 |
|------|------|
| `el` | `get el(): HTMLCanvasElement \| SVGSVGElement` |
| `getSize` / `resize` / `dispose` / `clear` | 生命周期管理 |
| `save` / `restore` | 状态栈管理（`save(createChild?)` SVG 用） |
| `translate` / `rotate` / `scale` | 增量变换 |
| `setTransform` | `(a, b, c, d, e, f)` 设置 2x3 仿射矩阵 |
| `setAttributes` | `(attributes: AO)` 批量设置视觉属性 |
| `rect` / `circle` / `line` / `text` / `path` / `image` | 形状绘制 |
| `clipPath` / `gradient` | 裁剪与渐变 |

## 类型守卫 (`guards/is.ts`)

| 函数 | 说明 |
|------|------|
| `isNum(v)` | `typeof v === 'number' && !NaN` |
| `isArr(v)` | `Array.isArray` |
| `isStr(v)` | `typeof v === 'string'` |
| `isBool(v)` | `typeof v === 'boolean'` |
| `isObj(v)` | `typeof v === 'object' && v !== null` |
| `isFunc(v)` | `typeof v === 'function'` |
| `isUndef(v)` | `v === undefined` |
| `isNull(v)` | `v === null` |
| `isNil(v)` | `undefined \| null` |
| `isNone(v)` | `v === 'none'`（CSS 属性值检测） |
| `isNaN(v)` | `Number.isNaN` |
| `isEmpty(v)` | nil/空字符串/空数组/空对象 |
| `isDateString(v)` | 可解析为 Date 的字符串 |
| `isDate(v)` | Date 实例或可解析日期字符串 |
| `isHTMLElement(v)` | `instanceof HTMLElement` |

## 数组工具 (`helpers/array.ts`)

| 函数 | 签名 | 说明 |
|------|------|------|
| `count` | `(arr, strict?)` | 计数（strict 时跳过 nil） |
| `min` / `max` | `(arr: number[])` | 最小/最大值（跳过 NaN） |
| `minBy` / `maxBy` | `<T>(arr, fn)` | 按访问器取极值对应元素 |
| `sum` | `(arr: number[])` | 求和 |
| `mean` | `(arr: number[])` | 均值 |
| `extent` | `(arr: number[])` → `[min, max]` | 值域 |
| `extentBy` | `<T>(arr, fn)` → `[T\|null, T\|null]` | 按访问器取值域元素 |
| `range` | `(start, stop, step?)` | 等差数列 |
| `uniqueArray` | `<T>(arr)` | 去重（基于 Set） |
| `ascending` / `descending` | `(a, b)` | 比较器（支持数字和字符串） |
| `quantile` | `(arr, p)` | 分位数（quickselect 算法） |
| `median` | `(arr)` | 中位数（= quantile 0.5） |
| `arrayFromThresholds` | `(thresholds, domain)` | 阈值转区间对数组 |
| `arrayFromRange` | `(range)` | 连续数组转相邻配对 |

## 刻度计算 (`helpers/ticks.ts`)

| 函数 | 签名 | 说明 |
|------|------|------|
| `tickIncrement` | `(start, stop, count)` | 计算刻度增量 |
| `tickStep` | `(start, end, count)` | 计算刻度步长（支持反向） |
| `nice` | `(start, stop, count)` → `[number, number]` | 将范围美化到整刻度 |
| `niceForce` | `(start, stop, count)` → `[number, number]` | 强制美化（保证 count 一致） |
| `tickSpec` | `(start, stop, count)` → `[a, b, inc]` | 计算刻度规格 |
| `ticks` | `(start, end, count)` → `number[]` | 生成约 count 个刻度值 |

## 数学工具 (`helpers/math.ts`)

| 导出 | 类型 | 说明 |
|------|------|------|
| `r2d` | 常量 | `180/π` 弧度转角度系数 |
| `d2r` | 常量 | `π/180` 角度转弧度系数 |
| `normalizeRadian` | 函数 | 弧度归一化到 `[0, 2π)` |
| `normalizeDegree` | 函数 | 角度归一化到 `[0, 360)` |
| `calcCenter` | `(s, e, i, o)` → `[x, y]` | 两个范围的中心点 |
| `convertP2C` | `(d, r)` → `[x, y]` | 极坐标转笛卡尔坐标 |
| `isNumEq` | `(a, b, p)` → `boolean` | 数值近似相等 |
| `inRange` | `(v, min, max)` | 闭区间判断 |
| `clamper` | `(min, max)` → `(v) => number` | 创建 clamp 函数工厂 |

## 数值格式化 (`helpers/number.ts`)

| 函数 | 说明 |
|------|------|
| `toNum(v)` | 转为数字 |
| `numDelta(a, b)` | 两数之差 |
| `financial(x, p?)` | 按精度四舍五入 |
| `financialFormat(x, p?)` | 按精度格式化为字符串 |

## 字符串工具 (`helpers/string.ts`)

| 函数 | 签名 | 说明 |
|------|------|------|
| `lowercase` | `(str, start?, stop?)` | 小写转换（支持指定位置范围） |
| `uppercase` | `(str, start?, stop?)` | 大写转换（支持指定位置范围） |
| `hashFnv32a` | `(str)` → `number` | FNV-1a 32 位哈希 |

## 对象工具 (`helpers/object.ts`)

| 函数 | 签名 | 说明 |
|------|------|------|
| `startsWith` | `(obj, prefix)` | 过滤出指定前缀的属性 |
| `replace` | `(obj, prefix)` | 移除属性名前缀并首字母小写 |
| `subAttrs` | `(obj, prefix)` | `startsWith` + `replace` 组合 |
| `defaultsDeep` | `(target, sources[])` | 深度合并默认值（仅填充 undefined） |
| `attrOf` | `(obj, of)` | 按 key 或访问器取值 |
| `groupBy` | `(arr, ...keys)` | 多级分组 |
| `flatGroupBy` | `(arr, ...keys)` | 扁平化分组（多 key 拼接） |

## 函数工具 (`helpers/function.ts`)

| 函数 | 说明 |
|------|------|
| `uid()` | 生成 UUID v4 |
| `uid8()` | 生成 8 位短 UUID |
| `identity(x)` | 恒等函数 |
| `compose(...fns)` | 函数组合（从左到右） |
| `debounce(fn, delay)` | 防抖 |
| `throttle(fn, delay)` | 节流 |

## 其他工具

| 模块 | 导出 | 说明 |
|------|------|------|
| `bisector.ts` | `Bisector` 类 | 二分查找器 |
| `bin.ts` | `Bin` 类, `BinItem` 接口 | 分箱器 |
| `quick-select.ts` | `quickselect(arr, k, l?, r?, compare?)` | 快速选择算法（就地） |
| `sort.ts` | `quickSort(arr: number[])` | 快速排序 |

## 注意事项

- 所有工具函数均为纯函数，无副作用
- 本包为 monorepo 中几乎所有包的底层依赖
- 类型使用 `type` 导出，不增加运行时包体积
- `IGraphicsRenderer` 是渲染器统一接口，Canvas 和 SVG 各自实现
