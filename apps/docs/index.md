---
layout: home
hero:
  name: Rendx
  text: 轻量级 2D 可视化渲染引擎
  tagline: 基于 TypeScript 的高性能场景图引擎，支持 Canvas2D 和 SVG 双渲染后端
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: Playground
      link: /playground
    - theme: alt
      text: API 参考
      link: /api/engine
features:
  - icon: 🎨
    title: 双渲染后端
    details: 同时支持 Canvas2D 和 SVG 渲染，通过统一的 IGraphicsRenderer 接口无缝切换。
  - icon: 🌳
    title: 场景图引擎
    details: Graphics → Group → Layer → Scene 层级结构，支持树形遍历、脏标记更新、世界矩阵传播。
  - icon: ⚡
    title: 高性能
    details: 多层渲染、视口裁剪、脏标记按需重绘、Z 排序缓存，轻松处理海量图形。
  - icon: 🔌
    title: 插件化
    details: 可扩展的插件系统，内置 Grid、History、Minimap 插件。
  - icon: 🎬
    title: 动画系统
    details: 内置几何变换、属性、裁剪动画，支持 33 种缓动函数。
  - icon: 📦
    title: Monorepo 架构
    details: 从数学运算到场景管理的分层包架构，按需引用，Tree-shakable。
---
