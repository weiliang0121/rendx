# rendx-bounding

轴对齐包围盒（AABB）的计算与操作，是形状碰撞检测、布局计算的基础。

## BoundingBox

```typescript
import { BoundingBox } from 'rendx-bounding';

// 创建
const box = BoundingBox.fromRect(10, 20, 100, 80);
const box2 = BoundingBox.fromPoints(10, 20, 110, 100);
```

### 计算属性

| 属性 | 说明 |
|------|------|
| `x`, `y`, `width`, `height` | 基本尺寸 |
| `cx`, `cy` | 中心点 |
| `right`, `bottom` | 右/下边界 |
| `radius` | 外接圆半径 |
| `aspect` | 宽高比 |
| `area` | 面积 |
| `empty` | 是否为空 |

### 方法

| 方法 | 说明 |
|------|------|
| `containsPoint(x, y)` | 点包含检测 |
| `containsBox(box)` | 盒包含检测 |
| `intersects(box)` | 相交检测 |
| `intersection(box)` | 返回相交区域 |
| `union(box)` | 返回并集 |
| `expandPoint(x, y)` | 扩展包含点 |
| `pad(top, right, bottom, left)` | 内边距 |
| `vertices()` | 四个顶点 |
