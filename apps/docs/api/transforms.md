# Transforms（动画）

## 概述

Rendx 的动画系统通过 Transform 类族实现。每个 Transform 是一个状态机，驱动基于时间的插值。

## 状态机

```
start → init → waiting →[elapsed ≥ delay]→ running →[elapsed > delay + duration]→ last
```

启用 `repeat(true)` 时，`last` → `start` 循环播放。

## BaseTransform

所有动画的基类，提供配置 API：

| 方法 | 说明 |
|------|------|
| `duration(ms)` | 动画持续时间（毫秒） |
| `delay(ms)` | 延迟时间 |
| `easing(name)` | 缓动函数名称 |
| `repeat(bool)` | 是否循环 |

## GraphicsTransform

几何变换动画（translate / rotate / scale）。

```typescript
const node = Node.create('circle', { fill: '#ff6600' });
node.shape.from(100, 300, 30);

node.useTransform()
  .translate(500, 0)        // 目标偏移
  .rotate(Math.PI * 2)      // 旋转 360°
  .scale(2, 2)              // 放大到 2 倍
  .duration(2000)
  .easing('elasticOut')
  .repeat(true);

app.scene.add(node);
app.requestRender();
```

## AttributeTransform

属性动画（opacity / fill / stroke 等）。

```typescript
const rect = Node.create('rect', { fill: '#ff0000', opacity: 1 });
rect.shape.from(100, 100, 200, 100);

rect.attrs.useTransform()
  .opacity(0)                        // 淡出
  .fill('#0000ff')                   // 颜色过渡
  .duration(1500)
  .easing('sineInOut');
```

## ClipBoxTransform

裁剪框动画，支持四个方向：

- `lr` — 从左到右
- `rl` — 从右到左
- `tb` — 从上到下
- `bt` — 从下到上

```typescript
node.attrs.useClipBoxTransform()
  .direction('lr')
  .duration(1000)
  .easing('cubicOut');
```

## 专用动画

| 类 | 用途 |
|---|------|
| `ArcTransform` | 弧线动画（角度插值） |
| `SectorTransform` | 扇形动画 |

## 缓动函数

33 种内置缓动函数，来自 `rendx-ease`：

`linear`, `quadIn/Out/InOut`, `cubicIn/Out/InOut`, `quartIn/Out/InOut`, `quintIn/Out/InOut`, `sineIn/Out/InOut`, `expIn/Out/InOut`, `circIn/Out/InOut`, `backIn/Out/InOut`, `elasticIn/Out/InOut`, `bounceIn/Out/InOut`
