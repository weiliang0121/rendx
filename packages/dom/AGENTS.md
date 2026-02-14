# rendx-dom

## 概述
DOM/SVG 元素操作工具集与文本测量功能。为 `rendx-canvas`、`rendx-svg`、`rendx-gradient` 提供底层 DOM API 封装。

## 依赖层级
Layer 1（依赖 `rendx-bounding`、`rendx-core`）

## 文件结构
```
src/
├── main.ts         入口，聚合导出 element/measure/font/canvas/omit/split
├── element.ts      DOM/SVG 元素操作（setAttrs, setStyles, createSvgEl 等）
├── canvas.ts       Canvas 文本测量（OffscreenCanvas）
├── measure.ts      文本包围盒测量（Canvas 优先，静态 fallback）
├── font.ts         FontOptions 接口与 CSS 字体字符串转换
├── omit.ts         文本截断（省略号处理）
├── split.ts        文本换行拆分
├── static.ts       静态字体度量表（SSR / 无 Canvas 环境 fallback）
├── type.ts         FontMap 类型定义
└── fonts/          内置字体度量数据
    ├── pingfangsc.ts
    ├── youshebiaotihei.ts
    └── simhei.ts
```

## 公开 API

### 元素操作 (`element.ts`)

| 函数 | 签名 | 说明 |
|------|------|------|
| `setAttrs` | `<T extends HTMLElement \| SVGElement>(el: T, attributes: AO): T` | 设置元素属性，`null` 值移除属性 |
| `setStyles` | `<T extends HTMLElement \| SVGElement>(el: T, styles: AO): T` | 设置元素样式（自动 camelCase → kebab-case） |
| `getSize` | `<T extends HTMLElement \| SVGElement>(el: T): Size` | 获取元素 clientWidth/clientHeight |
| `checkDocument` | `(): void` | 检查 `document` 是否存在，不存在则抛异常 |
| `createSvgEl` | `<T extends SVGElement>(type: string): T` | 创建 SVG 命名空间元素 |
| `createCanvasEl` | `(): HTMLCanvasElement` | 创建 Canvas 元素 |
| `getSvgElByTag` | `<T extends SVGElement>(el: SVGElement, tag: string): T` | 获取或创建 SVG 子元素（已有则复用，没有则创建并 appendChild） |
| `camelToKebab` | `(camelCase: string): string` | 驼峰转短横线 |
| `convertSVGAttrs` | `(camelCase: string): string` | SVG 属性名转换（白名单内保留原样） |
| `setSVGAttrs` | `<T extends SVGElement>(el: T, attributes: AO): T` | 设置 SVG 属性（自动转换属性名） |

> **SVG 属性白名单**：`preserveAspectRatio`、`clipPathUnits`、`gradientTransform`、`gradientUnits` 等 15 个属性保留驼峰命名，不做 kebab 转换。

### 文本测量 (`measure.ts`)

```typescript
getTextBoundingBox(font: Partial<FontOptions>, text: string): BoundingBox
```
优先使用 Canvas (`OffscreenCanvas`) 测量，不可用时 fallback 到静态字体度量表。

### Canvas 测量 (`canvas.ts`)

```typescript
getTextBoundingBoxByCanvas(font: string, text: string): BoundingBox | null
```
使用 `OffscreenCanvas` + `measureText()` 获取精确文本边界。环境不支持 `OffscreenCanvas` 时返回 `null`。

### 静态测量 (`static.ts`)

```typescript
getTextBoundingBoxByStatic(font: Partial<FontOptions>, text: string): BoundingBox
```
基于内置字体度量数据（每字符宽度百分比表）计算近似文本尺寸。支持 `bold`/`italic` 变体。内置字体：`pingfang sc`、`youshebiaotihei`、`simhei`。

### 字体 (`font.ts`)

```typescript
interface FontOptions {
  fontSize: number;       // 默认 10
  fontFamily: string;     // 默认 'sans-serif'
  fontWeight: string;
  fontStyle: string;
  fontVariant: string;
  lineHeight: number;
}

convertFontOptionsToCSS(fontOptions?: Partial<FontOptions>): string
```

### 文本截断 (`omit.ts`)

```typescript
omitText(text: string, w: number, style: Partial<FontOptions>, position: string): string
```
将文本截断到指定宽度 `w`，超出部分用 `...` 替代。`position` 支持 `'start'`、`'middle'`、`'end'`。

### 文本换行 (`split.ts`)

```typescript
splitText(text: string, w: number, style: Partial<FontOptions>): string[]
```
按宽度 `w` 将文本拆分为多行。支持空格、标点、中文字符处边界拆分。

## 未导出模块
- `static.ts` — 不在 `main.ts` 中直接导出，由 `measure.ts` 内部调用
- `type.ts` — `FontMap` 类型定义，由 `static.ts` 内部使用

## 设计要点
- **环境适配**：Canvas 测量依赖 `OffscreenCanvas`，Node.js/SSR 环境自动 fallback 到静态度量
- **SVG 属性名转换**：通过白名单区分需保留驼峰的 SVG 属性（如 `gradientUnits`）和需转换的属性
- **字体度量数据**：`fonts/` 目录下存储每个字符的宽度百分比数组 `[normal, bold, italic, boldItalic]`
- **被依赖关系**：`rendx-canvas`、`rendx-svg`、`rendx-gradient` 都依赖本包的元素操作和 SVG 工具函数
