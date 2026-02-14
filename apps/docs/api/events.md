# Events（事件系统）

## 概述

Rendx 模拟 DOM 事件流的三阶段模型：Capture → Target → Bubble。

## 事件类型

| 事件 | 触发方式 |
|------|----------|
| `click` | 原生事件直传 |
| `pointerdown` | 原生事件直传 |
| `pointerup` | 原生事件直传 |
| `pointermove` | 原生事件直传 |
| `pointerenter` | dispatcher 模拟合成 |
| `pointerleave` | dispatcher 模拟合成 |
| `pointerover` | dispatcher 模拟合成 |
| `pointerout` | dispatcher 模拟合成 |
| `wheel` | 原生事件直传 |

## 使用方式

```typescript
const node = Node.create('rect', { fill: '#0066ff' });
node.shape.from(100, 100, 200, 150);

// 冒泡阶段监听
node.on('click', (e) => {
  console.log('clicked', e.worldX, e.worldY);
});

// 捕获阶段监听
node.on('pointerdown', (e) => {
  console.log('capture pointerdown');
}, { capture: true });

// 一次性监听
node.on('pointerup', (e) => {
  console.log('only once');
}, { once: true });

// 移入/移出
node.on('pointerenter', () => {
  node.attrs.set('fill', '#ff0000');
  app.render();
});
node.on('pointerleave', () => {
  node.attrs.set('fill', '#0066ff');
  app.render();
});
```

## SimulatedEvent

引擎事件对象：

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 事件类型 |
| `target` | `Graphics` | 目标节点 |
| `currentTarget` | `Graphics` | 当前处理节点 |
| `offsetX / offsetY` | `number` | 画布坐标 |
| `worldX / worldY` | `number` | 场景坐标 |

| 方法 | 说明 |
|------|------|
| `composedPath()` | target → root 路径（缓存） |
| `stopPropagation()` | 阻止冒泡 |
| `copy()` | 浅拷贝 |

## EventTarget

基于 eventemitter3 的事件目标（惰性创建 emitter）：

- `on(type, fn, options?)` — 监听事件
- `off(type, fn)` — 移除监听
- `eventTypes()` — 返回已注册事件类型
