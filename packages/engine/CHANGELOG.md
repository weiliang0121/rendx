# @vis/engine

## 0.2.0

### Minor Changes

- [`cc65501`](https://github.com/weiliang0121/rendx/commit/cc6550104e620d584321faaa05e7b92cd30cf00c) - 发布第一个正式版本

### Patch Changes

- Updated dependencies [[`cc65501`](https://github.com/weiliang0121/rendx/commit/cc6550104e620d584321faaa05e7b92cd30cf00c)]:
  - rendx-interpolate@0.1.0
  - rendx-bounding@0.1.0
  - rendx-canvas@0.1.0
  - rendx-shape@0.1.0
  - rendx-core@0.1.0
  - rendx-ease@0.1.0
  - rendx-path@0.1.0
  - rendx-svg@0.1.0

## 0.1.0

### Minor Changes

- 03f0d74: 发布准备：
  - 所有包添加 license、description、repository、homepage、keywords 元数据
  - 添加 MIT LICENSE 文件
  - 更新 README.md（完整架构图、快速上手、徽章）
  - 添加 GitHub Actions CI/CD 及 GitHub Pages 部署工作流

### Patch Changes

- 03f0d74: 修复多个引擎 bug：
  - RoundShape 的 ry 参数现在可选，默认与 rx 相同（符合 SVG 规范）
  - 图片加载完成后自动触发重新渲染（imageLoader.onChange）
  - 修复 repeat 动画在重复周期后停止的问题
  - Attributes.useTransform() 改为实际创建 AttributeTransform 实例
- Updated dependencies [03f0d74]
  - @dye/core@0.0.1
  - @dye/bounding@0.0.1
  - @dye/path@0.0.1
  - @dye/ease@0.0.1
  - @dye/interpolate@0.0.1
  - @dye/shape@0.0.1
  - @dye/canvas@0.0.1
  - @dye/svg@0.0.1

## 1.0.17

### Patch Changes

- Updated dependencies
  - @vis/shape@1.0.7
  - @vis/canvas@1.0.7
  - @vis/svg@1.0.1

## 1.0.16

### Patch Changes

- Updated dependencies
  - @vis/util@1.0.8
  - @vis/canvas@1.0.7
  - @vis/interpolate@1.0.6
  - @vis/shape@1.0.6
  - @vis/svg@1.0.1

## 1.0.15

### Patch Changes

- Updated dependencies
  - @vis/util@1.0.7
  - @vis/canvas@1.0.6
  - @vis/interpolate@1.0.5
  - @vis/shape@1.0.5
  - @vis/svg@1.0.1

## 1.0.14

### Patch Changes

- 增加动画的重复机制
- Updated dependencies
  - @vis/ease@0.0.4

## 1.0.13

### Patch Changes

- Updated dependencies
  - @vis/util@1.0.6
  - @vis/canvas@1.0.5
  - @vis/interpolate@1.0.4
  - @vis/shape@1.0.4
  - @vis/svg@1.0.1

## 1.0.12

### Patch Changes

- Updated dependencies
  - @vis/util@1.0.5
  - @vis/canvas@1.0.4
  - @vis/interpolate@1.0.3
  - @vis/shape@1.0.3
  - @vis/svg@1.0.1

## 1.0.11

### Patch Changes

- 添加resize方法
- Updated dependencies
  - @vis/canvas@1.0.3
  - @vis/renderer@1.0.1
  - @vis/svg@1.0.1

## 1.0.10

### Patch Changes

- Updated dependencies
  - @vis/shape@1.0.2
  - @vis/util@1.0.4
  - @vis/canvas@1.0.2
  - @vis/svg@1.0.0
  - @vis/interpolate@1.0.2

## 1.0.9

### Patch Changes

- Updated dependencies
  - @vis/util@1.0.3
  - @vis/canvas@1.0.1
  - @vis/interpolate@1.0.1
  - @vis/shape@1.0.1
  - @vis/svg@1.0.0

## 0.4.0

### Minor Changes

- adb78c3: 1.新增路径几何体；

## 0.3.1

### Patch Changes

- Updated dependencies [7204be8]
- Updated dependencies [7204be8]
- Updated dependencies [7204be8]
  - @vis/util@0.2.0
  - @vis/shape@0.2.0
  - @vis/canvas@0.1.6

## 0.3.0

### Minor Changes

- c68b9de: 1.变更渲染引擎-全局事件注册机制

### Patch Changes

- Updated dependencies [449bf49]
  - @vis/util@0.1.0
  - @vis/canvas@0.1.5
  - @vis/shape@0.1.1

## 0.2.1

### Patch Changes

- c72663a: 1.修复场景图父节点 needUpdate 时，子节点没有自动设置为 needUpdate 的问题；

## 0.2.0

### Minor Changes

- ad67c79: 1.增加多边形几何体

## 0.1.1

### Patch Changes

- Updated dependencies [75c4088]
  - @vis/canvas@0.1.4

## 0.1.0

### Minor Changes

- 6bf0cc6: 1.line gometry 增加 closed 属性，允许线条闭合;

### Patch Changes

- Updated dependencies [6bf0cc6]
- Updated dependencies [6bf0cc6]
  - @vis/shape@0.1.0
  - @vis/canvas@0.1.3

## 0.0.6

### Patch Changes

- 2003f75: 1.修复 node 结点没有计算 zIndex 的问题

  2.更改 PolarLineGeometry 命名为 ArcLineGeometry

## 0.0.5

### Patch Changes

- Updated dependencies [33f11b2]
  - @vis/shape@0.0.4

## 0.0.4

### Patch Changes

- 1.更新工作流程后的一次工程更新
- Updated dependencies
  - @vis/bounding@0.0.3
  - @vis/canvas@0.1.2
  - @vis/gradient@0.0.3
  - @vis/path@0.0.3
  - @vis/renderer@0.0.3
  - @vis/shape@0.0.3
  - @vis/style@0.0.3
  - @vis/svg@0.0.3
  - @vis/util@0.0.3

## 0.0.3

### Patch Changes

- 更新package.json配置项
- Updated dependencies
  - @vis/bounding@0.0.2
  - @vis/gradient@0.0.2
  - @vis/renderer@0.0.2
  - @vis/canvas@0.1.1
  - @vis/shape@0.0.2
  - @vis/style@0.0.2
  - @vis/path@0.0.2
  - @vis/util@0.0.2
  - @vis/svg@0.0.2

## 0.0.2

### Patch Changes

- Updated dependencies
  - @vis/canvas@0.1.0
