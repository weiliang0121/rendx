# Rendx

<p align="center">
  <strong>轻量、高效的 2D 可视化渲染引擎</strong>
</p>

<p align="center">
  基于 TypeScript 构建，支持 Canvas2D 和 SVG 双渲染后端
</p>

<p align="center">
  <a href="https://github.com/weiliang0121/dye/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/weiliang0121/dye"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

---

## 特性

- 🎨 **双渲染后端** — Canvas2D + SVG，统一接口无缝切换
- 🌳 **场景图引擎** — Scene → Layer → Group → Node 层级结构，脏标记按需重绘
- ⚡ **高性能** — 多 Canvas 分层渲染、视口裁剪、Z 排序缓存
- 🎬 **动画系统** — 几何变换 / 属性 / 裁剪 / 弧线 / 扇形 5 种动画，33 种缓动函数
- 🖱️ **事件系统** — 完整 W3C 三阶段事件流（capture → target → bubble）
- 📦 **Monorepo** — 12 个包分层架构，按需引用，Tree-shakable
- 🔌 **插件化** — Grid / History / Minimap 内置插件
- 💾 **序列化** — toJSON / fromJSON 场景持久化

## 快速开始

```bash
npm install rendx-engine
```

```typescript
import { App, Node } from 'rendx-engine';

const app = new App({ width: 800, height: 600 });
app.mount(document.getElementById('container')!);

const circle = Node.create('circle', { fill: '#ff0000', stroke: '#333' });
circle.shape.from(400, 300, 50);
app.scene.add(circle);

const rect = Node.create('rect', { fill: '#0066ff', opacity: 0.8 });
rect.shape.from(100, 100, 200, 150);
app.scene.add(rect);

app.render();
```

## 包架构

```
Layer 0 (零依赖)
├── rendx-core         基础类型 + 工具函数
├── rendx-bounding     包围盒计算
├── rendx-path         SVG 路径构建器
└── rendx-ease         缓动函数

Layer 1
├── rendx-dom          DOM/SVG 元素操作
└── rendx-curve        曲线插值算法

Layer 2
├── rendx-interpolate  插值器（数值、颜色、向量、矩阵）
├── rendx-shape        形状生成器
└── rendx-gradient     渐变解析与生成

Layer 3
├── rendx-canvas       Canvas2D 渲染器
└── rendx-svg          SVG 渲染器

Layer 4
└── rendx-engine       场景图引擎

插件
├── rendx-grid-plugin     网格插件
├── rendx-history-plugin  历史记录插件
└── rendx-minimap-plugin  小地图插件
```

## 文档

- 📖 [在线文档](https://weiliang0121.github.io/dye/)
- 🎮 [Playground](https://weiliang0121.github.io/dye/playground/)

## 开发

```bash
pnpm install          # 安装依赖
pnpm build            # 构建所有包
pnpm test             # 运行测试
pnpm lint             # 代码检查
pnpm format           # 格式化
```

## 技术栈

- **语言**: TypeScript 5.9+ (strict 模式)
- **构建**: tsup (ESM + CJS + DTS)
- **编排**: Turborepo
- **包管理**: pnpm 9.x workspace
- **代码质量**: ESLint 9 + Prettier 3
- **版本管理**: Changesets
- **提交规范**: commitlint + husky + Conventional Commits

## License

[MIT](./LICENSE) © wei.liang
