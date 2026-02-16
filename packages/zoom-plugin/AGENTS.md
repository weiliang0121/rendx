# rendx-zoom-plugin

## 概述

画布缩放平移插件，提供滚轮缩放、触控板 pinch、空格+拖拽平移、鼠标中键平移和编程式缩放控制。

## 依赖层级

插件层（依赖 rendx-engine）

## API

zoomPlugin(options?): ZoomPlugin

### ZoomPluginOptions

| 属性                  | 类型     | 默认值 | 说明                        |
| --------------------- | -------- | ------ | --------------------------- |
| minZoom               | number   | 0.1    | 最小缩放比例                |
| maxZoom               | number   | 5      | 最大缩放比例                |
| zoomStep              | number   | 0.1    | 滚轮缩放步进                |
| enableWheelZoom       | boolean  | true   | 是否启用滚轮缩放            |
| ctrlZoom              | boolean  | false  | 是否需按 Ctrl/Meta 键才缩放 |
| enableSpacePan        | boolean  | true   | 是否启用空格+拖拽平移       |
| enableMiddleButtonPan | boolean  | true   | 是否启用鼠标中键拖拽平移    |
| pinchSensitivity      | number   | 0.01   | 触控板 pinch 灵敏度         |
| onZoomChange          | function | -      | 缩放/平移变化回调           |

### ZoomPlugin 方法

| 方法                    | 说明                    |
| ----------------------- | ----------------------- |
| getZoom()               | 获取当前缩放比例        |
| getPan()                | 获取当前平移量 [tx, ty] |
| setZoom(zoom, cx?, cy?) | 以指定中心点设置缩放    |
| zoomBy(delta, cx?, cy?) | 相对缩放                |
| zoomIn()                | 放大一步                |
| zoomOut()               | 缩小一步                |
| panBy(dx, dy)           | 平移画布                |
| reset()                 | 重置缩放和平移          |
| fitView(padding?)       | 适应视口                |
| isPanning()             | 是否正在平移            |

## 事件

zoom:change — { zoom: number, pan: [number, number] }

## 实现细节

- 通过 Scene 的 scale/translate 控制视口变换
- 缩放围绕鼠标/指定点进行（焦点缩放）
- 空格+拖拽 / 鼠标中键拖拽 平移
- 滚轮默认直接缩放，设 ctrlZoom=true 则需按 Ctrl
- 触控板 pinch 自动识别（浏览器 ctrlKey 标记）
- App 必须先 mount() 再 use()
