# Serialization（序列化）

## 概述

Rendx 支持将场景图序列化为 JSON，用于保存、回放、协作编辑。

## 使用方式

```typescript
// 序列化
const json = app.toJSON();
localStorage.setItem('scene', JSON.stringify(json));

// 反序列化（创建新实例）
const saved = JSON.parse(localStorage.getItem('scene')!);
const newApp = App.fromJSON(saved);
newApp.mount(container);
newApp.render();

// 就地恢复（保留挂载和插件）
app.restoreFromJSON(saved);
app.render();
```

## RendxJSON 类型

```typescript
interface RendxJSON {
  width: number;
  height: number;
  layers: LayerJSON[];
}

interface LayerJSON {
  name: string;
  index: number;
  children: ChildJSON[];
}

interface ChildJSON {
  type: 'node' | 'group';
  // Node: shape + attrs
  // Group: children
}
```

## API

| 函数                               | 说明                     |
| ---------------------------------- | ------------------------ |
| `serialize(layers, width, height)` | 序列化层数组 → RendxJSON |
| `deserialize(json, cfg)`           | 反序列化 → Layer[]       |
| `serializeLayer(layer)`            | 序列化单个层             |
