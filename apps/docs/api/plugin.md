# Plugin（插件系统）

## 接口

```typescript
interface Plugin {
  /** 插件名称（用于去重和调试） */
  name: string;
  /** 声明本插件管理的 state keys */
  state?: PluginStateDeclaration[];
  /** 声明需要使用的渲染层 */
  layers?: PluginLayerDeclaration[];
  /** 安装插件，在 app.use() 时调用 */
  install(app: App): void;
  /** 当 App resize 时调用 */
  resize?(width: number, height: number): void;
  /** 序列化插件自身状态 */
  serialize?(): Record<string, unknown>;
  /** 从持久化数据恢复插件状态 */
  deserialize?(data: Record<string, unknown>): void;
  /** 卸载插件，在 app.dispose() 时自动调用 */
  dispose?(): void;
}
```

### PluginStateDeclaration

```typescript
interface PluginStateDeclaration {
  key: string; // state key（推荐 `pluginName:field` 命名空间）
  description: string; // 描述（文档/调试用）
  initial: unknown; // 初始值
}
```

App 在 `use()` 时校验 key 不冲突，并以初始值写入 state map。插件通过 `app.setState(key, value)` / `app.getState(key)` 读写状态。

### PluginLayerDeclaration

```typescript
interface PluginLayerDeclaration {
  name: string; // 层名称
  zIndex?: number; // 全局层级（负数在 default 之下，正数在之上）
}
```

App 在 `use()` 时自动创建/复用所需图层。

## 使用方式

```typescript
import {App} from 'rendx-engine';

const myPlugin: Plugin = {
  name: 'my-plugin',
  install(app) {
    console.log('Plugin installed', app.cfg);
  },
  resize(w, h) {
    console.log('Canvas resized', w, h);
  },
  dispose() {
    console.log('Plugin disposed');
  },
};

const app = new App({width: 800, height: 600});
app.use(myPlugin);

// 获取插件
const p = app.getPlugin('my-plugin');
```

## 内置插件

| 插件      | 包                                                     | 说明                                   |
| --------- | ------------------------------------------------------ | -------------------------------------- |
| Graph     | [`rendx-graph-plugin`](/packages/graph-plugin)         | 图元素管理（Node/Edge CRUD、依赖追踪） |
| Selection | [`rendx-selection-plugin`](/packages/selection-plugin) | 选框交互（点选/多选/框选/悬停高亮）    |
| Drag      | [`rendx-drag-plugin`](/packages/drag-plugin)           | 拖拽交互（约束/多选联动/插件软感知）   |
| Connect   | [`rendx-connect-plugin`](/packages/connect-plugin)     | 连线交互（端口吸附/预览线/双模式）     |
| Grid      | [`rendx-grid-plugin`](/packages/grid-plugin)           | 网格背景                               |
| History   | [`rendx-history-plugin`](/packages/history-plugin)     | 撤销/重做                              |
| Minimap   | [`rendx-minimap-plugin`](/packages/minimap-plugin)     | 缩略图导航                             |

各插件的完整 API 文档请查阅对应的[包参考](/packages/graph-plugin)页面。

## 插件间通信

插件通过 `app.bus`（EventEmitter）事件总线实现松耦合通信：

```typescript
// 发布信号
app.bus.emit('drag:start', {targets, origin});

// 订阅信号
app.bus.on('drag:end', e => {
  console.log('拖拽结束', e.totalDelta);
});
```

## 插件状态

```typescript
// 写入状态
app.setState('drag:dragging', true);

// 读取状态
const selected = app.getState<Graphics[]>('selection:selected');
```

## 注意事项

- 同名插件不会重复注册
- `resize` 会在 `app.resize()` 时自动调用
- `dispose` 会在 `app.dispose()` 时自动调用
