# rendx-bounding

## 概述
提供轴对齐包围盒（AABB）的计算与操作。是形状碰撞检测、布局计算的基础。

## 依赖层级
Layer 0（零依赖）

## 核心 API

### BoundingBox 类
表示轴对齐包围盒。

**公有属性**：
- `x: number` — 左上角 X
- `y: number` — 左上角 Y
- `width: number` — 宽度
- `height: number` — 高度

**静态工厂**：
- `BoundingBox.fromRect(x, y, width, height)` — 从矩形创建
- `BoundingBox.fromPoints(x1, y1, x2, y2)` — 从两点创建

**计算属性**：
- `cx`, `cy` — 中心点
- `right`, `bottom` — 右/下边界
- `radius` — 内切圆半径 `min(w,h)/2`
- `aspect` — 宽高比 `h/w`
- `area` — 面积 `w*h`
- `empty` — 宽或高 ≤ 0

**设值**：
- `set(x, y, w, h)` — 重新设值（返回 this）
- `copy()` — 深拷贝
- `toArray()` — 返回 `[x, y, width, height]`

**空间查询**：
- `containsPoint(px, py)` — 点是否在包围盒内
- `in(px, py)` — containsPoint 的别名（已弃用）
- `containsBox(box)` — 是否完全包含另一个包围盒
- `intersects(box)` — 是否与另一个包围盒相交

**变换（返回新实例）**：
- `intersection(box)` — 求交集
- `union(box)` — 求并集
- `expandPoint(px, py)` — 扩展到包含指定点
- `pad(padding, outward?)` — 四边内缩/外扩，`padding: [top, right, bottom, left]`，`outward` 默认 `false`（内缩）

**坐标转换**：
- `localXY(px, py)` — 全局坐标转本地坐标

**分割**：
- `divideX(count, index)` — X 向等分
- `divideY(count, index)` — Y 向等分
- `divideXByScale(scale, index)` — 按 scale 函数 X 向分割
- `divideYByScale(scale, index)` — 按 scale 函数 Y 向分割
- `vertices()` — 返回四顶点元组

## 典型用法
```typescript
const box = BoundingBox.fromRect(10, 20, 100, 50);
box.containsPoint(50, 40); // true
box.cx; // 60
box.right; // 110
box.area; // 5000

const merged = box.union(BoundingBox.fromRect(0, 0, 50, 50));
```

## 变更记录
- 删除 `BoundingRect`（无外部消费者）
- 删除 `fromLayout`（与 fromRect 重复）、`r`（与 radius 重复）
- 重命名：`from→set`、`contains→containsBox`、`intersect→intersects`、`cut→intersection`
- 新增 `containsPoint`，保留 `in` 作为别名并标记 `@deprecated`
- `intersection` 返回新实例（原 `cut` 会修改自身）
- 新增：`right`、`bottom`、`area`、`empty`、`toArray`、`union`、`expandPoint`
- `divideXByScale`/`divideYByScale` 的 scale 参数已添加类型约束
