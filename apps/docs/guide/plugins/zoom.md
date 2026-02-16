# Zoom Plugin（画布缩放平移）

**包名**：`rendx-zoom-plugin` · [包参考](/packages/zoom-plugin)

提供滚轮缩放、触控板 pinch、空格+拖拽平移、鼠标中键平移和编程式缩放控制。

## 实现原理

通过操作 Scene 的 `scale()` 和 `translate()` 控制视口变换。缩放围绕鼠标位置（焦点缩放），数学公式：

```
newTranslate = oldTranslate + mousePos × (oldScale − newScale)
```

## 交互模式

| 操作             | 条件                         | 行为                               |
| ---------------- | ---------------------------- | ---------------------------------- |
| 滚轮             | `ctrlZoom=false`（默认）     | 直接缩放                           |
| Ctrl/Meta + 滚轮 | `ctrlZoom=true`              | 按住修饰键才缩放                   |
| 触控板 pinch     | 自动识别                     | 缩放（浏览器自动设置 ctrlKey）     |
| 空格 + 拖拽      | `enableSpacePan=true`        | 画布平移，光标变为 `grab/grabbing` |
| 鼠标中键拖拽     | `enableMiddleButtonPan=true` | 画布平移                           |

## 使用

```typescript
import {zoomPlugin} from 'rendx-zoom-plugin';

const zoom = zoomPlugin({
  minZoom: 0.1,
  maxZoom: 5,
  zoomStep: 0.1,
  ctrlZoom: false,
  enableSpacePan: true,
  enableMiddleButtonPan: true,
});
app.use(zoom);

// 编程式控制
zoom.setZoom(1.5); // 设置缩放比例
zoom.setZoom(2, 400, 300); // 以 (400,300) 为焦点缩放到 2x
zoom.zoomIn(); // 放大一步
zoom.zoomOut(); // 缩小一步
zoom.panBy(100, 0); // 向右平移 100px
zoom.reset(); // 重置为初始状态
zoom.fitView(20); // 适应所有节点 + 20px 边距

// 查询
zoom.getZoom(); // 当前缩放比例
zoom.getPan(); // 当前平移 [tx, ty]
zoom.isPanning(); // 是否正在平移
```

## 事件

| 事件名        | 负载            | 触发时机            |
| ------------- | --------------- | ------------------- |
| `zoom:change` | `{ zoom, pan }` | 每次缩放/平移变化时 |
