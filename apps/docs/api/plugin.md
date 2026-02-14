# Plugin（插件系统）

## 接口

```typescript
interface Plugin {
  name: string;
  install(app: App): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}
```

## 使用方式

```typescript
import { App } from 'rendx-engine';

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

const app = new App({ width: 800, height: 600 });
app.use(myPlugin);

// 获取插件
const p = app.getPlugin('my-plugin');
```

## 内置插件

| 插件 | 包 | 说明 |
|------|---|------|
| Grid | `rendx-grid-plugin` | 网格背景 |
| History | `rendx-history-plugin` | 撤销/重做 |
| Minimap | `rendx-minimap-plugin` | 缩略图导航 |

## 注意事项

- 同名插件不会重复注册
- `resize` 会在 `app.resize()` 时自动调用
- `dispose` 会在 `app.dispose()` 时自动调用
