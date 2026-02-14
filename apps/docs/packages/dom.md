# rendx-dom

DOM / SVG 元素操作工具集与文本测量功能。

## 元素操作

| 函数 | 说明 |
|------|------|
| `setAttrs(el, attrs)` | 设置元素属性 |
| `setStyles(el, styles)` | 设置元素样式 |
| `getSize(el)` | 获取元素尺寸 |
| `createSvgEl(tag)` | 创建 SVG 元素 |
| `createCanvasEl()` | 创建 Canvas 元素 |
| `checkDocument()` | 检查 document 可用性 |

## 文本测量

```typescript
import { getTextBoundingBox } from 'rendx-dom';

const box = getTextBoundingBox(
  { fontSize: 14, fontFamily: 'sans-serif' },
  'Hello World'
);
// { width, height, ... }
```

## 文本处理

| 函数 | 说明 |
|------|------|
| `omitText(text, w, style, position)` | 溢出省略 |
| `splitText(text, w, style)` | 按宽度换行 |
| `convertFontOptionsToCSS(font)` | 字体配置 → CSS |

## 内置字体度量

`pingfang sc`, `youshebiaotihei`, `simhei`
