# App

`App` 是 Rendx 引擎的顶层控制器，负责场景、渲染层、事件和插件的统一管理。

## 构造

```typescript
import {App} from 'rendx-engine';

const app = new App({
  width: 800,
  height: 600,
  layers: ['background', 'foreground'],
  autoResize: false,
});
```

### AppConfig

继承 `RendererConfig`，额外配置：

| 属性         | 类型       | 说明                        |
| ------------ | ---------- | --------------------------- |
| `width`      | `number`   | 画布宽度（默认 800）        |
| `height`     | `number`   | 画布高度（默认 600）        |
| `layers`     | `string[]` | 额外渲染层名称              |
| `autoResize` | `boolean`  | 监听容器尺寸变化自动 resize |

## 生命周期

| 方法               | 说明                                 |
| ------------------ | ------------------------------------ |
| `mount(container)` | 挂载到 DOM，创建 Canvas 并绑定事件   |
| `render()`         | 同步渲染一帧（仅重绘脏层）           |
| `requestRender()`  | rAF 异步渲染循环（有动画时自动继续） |
| `resize(w, h)`     | 调整画布尺寸，同步更新所有层         |
| `clear()`          | 取消 rAF，清空各层                   |
| `dispose()`        | 销毁引擎释放所有资源                 |

## 层管理

| 方法                    | 说明           |
| ----------------------- | -------------- |
| `addLayer(name, index)` | 动态添加渲染层 |
| `getLayer(name)`        | 获取指定层     |

App 初始化时自动创建：

- `__event__` — 透明事件层（z=99999），不渲染，仅接收事件
- `default` — 默认渲染层（z=0）

## 插件

| 方法              | 说明                   |
| ----------------- | ---------------------- |
| `use(plugin)`     | 注册插件（同名不重复） |
| `getPlugin(name)` | 获取已注册的插件       |

## 导出与序列化

| 方法                       | 说明                           |
| -------------------------- | ------------------------------ |
| `toCanvas()`               | 合成所有渲染层到单个 Canvas    |
| `toJSON()`                 | 序列化场景图为 RendxJSON       |
| `App.fromJSON(json, cfg?)` | 从 JSON 创建 App（静态工厂）   |
| `restoreFromJSON(json)`    | 就地恢复场景（保留挂载和插件） |

## 属性

| 属性        | 类型                     | 说明               |
| ----------- | ------------------------ | ------------------ |
| `scene`     | `Scene`                  | 场景根节点         |
| `observer`  | `EventObserver`          | 事件观察器         |
| `container` | `HTMLDivElement \| null` | 挂载容器（只读）   |
| `mounted`   | `boolean`                | 是否已挂载（只读） |
