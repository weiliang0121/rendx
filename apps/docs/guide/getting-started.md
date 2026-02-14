# 快速开始

## 安装

```bash
pnpm add rendx-engine
```

`rendx-engine` 是 Rendx 的顶层包，它会自动引入所有必要的底层依赖（`rendx-canvas`、`rendx-shape`、`rendx-path` 等）。

## 基本用法

```typescript
import { App, Node } from 'rendx-engine';

// 1. 创建引擎实例
const app = new App({ width: 800, height: 600 });

// 2. 挂载到 DOM
app.mount(document.getElementById('container')!);

// 3. 创建图形节点
const circle = Node.create('circle', { fill: '#ff0000', stroke: '#333' });
circle.shape.from(400, 300, 50); // cx, cy, r

const rect = Node.create('rect', { fill: '#0066ff', opacity: 0.8 });
rect.shape.from(100, 100, 200, 150); // x, y, width, height

// 4. 添加到场景
app.scene.add(circle);
app.scene.add(rect);

// 5. 渲染
app.render();
```

## 使用动画

```typescript
import { App, Node } from 'rendx-engine';

const app = new App({ width: 800, height: 600 });
app.mount(document.getElementById('container')!);

const circle = Node.create('circle', { fill: '#ff6600' });
circle.shape.from(100, 300, 40);

// 配置平移动画
circle.useTransform()
  .translate(600, 0)
  .duration(2000)
  .easing('cubicInOut')
  .repeat(true);

app.scene.add(circle);

// 启动动画循环
app.requestRender();
```

## 事件交互

```typescript
const rect = Node.create('rect', { fill: '#00cc88' });
rect.shape.from(200, 200, 100, 80);

rect.on('pointerenter', () => {
  rect.attrs.set('fill', '#ff0000');
  app.render();
});

rect.on('pointerleave', () => {
  rect.attrs.set('fill', '#00cc88');
  app.render();
});

rect.on('click', (e) => {
  console.log('clicked at', e.worldX, e.worldY);
});

app.scene.add(rect);
```

## 多层渲染

```typescript
const app = new App({
  width: 800,
  height: 600,
  layers: ['background', 'foreground'],
});
app.mount(document.getElementById('container')!);

const bgLayer = app.getLayer('background');
const fgLayer = app.getLayer('foreground');

// 背景层放网格等静态内容
const bgRect = Node.create('rect', { fill: '#f0f0f0' });
bgRect.shape.from(0, 0, 800, 600);
bgLayer!.add(bgRect);

// 前景层放交互内容
const circle = Node.create('circle', { fill: '#ff0000' });
circle.shape.from(400, 300, 50);
fgLayer!.add(circle);

app.render();
```

## 下一步

- [核心概念](./concepts) — 理解场景图、脏标记、渲染管线
- [架构总览](./architecture) — 了解包层级和依赖关系
- [API 参考](/api/engine) — 完整 API 文档
- [Playground](/playground) — 在线体验
