# Minimap Plugin（小地图）

**包名**：`rendx-minimap-plugin` · [包参考](/packages/minimap-plugin)

在画布角落叠加缩略视图，显示所有节点的简化矩形以及当前视口指示器，帮助用户定位场景全貌。

## 绘制原理

1. 遍历所有 Layer，收集每个 Node 的 `getWorldBBox()`
2. 计算全部节点的包围盒并集（场景总范围）
3. 等比缩放映射到小地图画布
4. 每个节点绘制为半透明填充矩形（颜色取节点 `fill` 属性）
5. 绘制蓝色边框矩形标识当前视口

## 使用

```typescript
import {minimapPlugin} from 'rendx-minimap-plugin';

app.use(
  minimapPlugin({
    width: 200,
    height: 150,
    position: 'bottom-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    margin: 10,
    viewportColor: 'rgba(24,144,255,0.8)',
    nodeFill: '#999',
  }),
);

// 场景变化后手动刷新
const minimap = app.getPlugin('minimap');
minimap.draw();

// 运行时配置更新
minimap.update({position: 'top-left', margin: 20});
```
