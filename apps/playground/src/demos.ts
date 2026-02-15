// --- Beginner: Basic Rendering ---
import basicShapes from './demos/basic-shapes.js?raw';
import roundRect from './demos/round-rect.js?raw';
import dashPatterns from './demos/dash-patterns.js?raw';
import pathShape from './demos/path-shape.js?raw';

// --- Beginner: Positioning & More Shapes ---
import transform from './demos/transform.js?raw';
import zIndex from './demos/z-index.js?raw';
import symbol from './demos/symbol.js?raw';
import image from './demos/image.js?raw';

// --- Intermediate: Scene Graph ---
import sceneTree from './demos/scene-tree.js?raw';
import multiLayer from './demos/multi-layer.js?raw';
import visibilityToggle from './demos/visibility-toggle.js?raw';
import pointerEvents from './demos/pointer-events.js?raw';
import solarSystem from './demos/solar-system.js?raw';

// --- Intermediate: Events & Interaction ---
import interactiveHover from './demos/interactive-hover.js?raw';
import dragDrop from './demos/drag-drop.js?raw';
import eventBubbling from './demos/event-bubbling.js?raw';

// --- Intermediate: Data Viz Shapes ---
import sectorArc from './demos/sector-arc.js?raw';
import polygonCurve from './demos/polygon-curve.js?raw';
import areaChart from './demos/area-chart.js?raw';

// --- Intermediate: Visual Attributes ---
import gradient from './demos/gradient.js?raw';
import staticClip from './demos/static-clip.js?raw';
import customData from './demos/custom-data.js?raw';

// --- Advanced: Basic Animation ---
import translateAnimation from './demos/translate-animation.js?raw';
import rotateAnimation from './demos/rotate-animation.js?raw';
import easingShowcase from './demos/easing-showcase.js?raw';
import attributeAnimation from './demos/attribute-animation.js?raw';

// --- Advanced: Complex Animation ---
import sectorAnimation from './demos/sector-animation.js?raw';
import arcGauge from './demos/arc-gauge.js?raw';
import clipboxAnimation from './demos/clipbox-animation.js?raw';

// --- Advanced: Engine Features ---
import serialization from './demos/serialization.js?raw';
import plugin from './demos/plugin.js?raw';
import randomCircles from './demos/random-circles.js?raw';

// --- Plugin: Graph Plugin ---
import graphPluginDemo from './demos/graph-plugin.js?raw';
import elementLifecycleDemo from './demos/graph-lifecycle.js?raw';
import elementHistoryDemo from './demos/graph-history.js?raw';

export interface Demo {
  name: string;
  code: string;
}

export const demos: Demo[] = [
  // ── Beginner: Basic Rendering ──
  {name: '基础图形 Basic Shapes', code: basicShapes},
  {name: '圆角矩形 Round Rect', code: roundRect},
  {name: '虚线样式 Dash Patterns', code: dashPatterns},
  {name: '路径图形 Path Shape', code: pathShape},

  // ── Beginner: Positioning & More Shapes ──
  {name: '变换 Transform', code: transform},
  {name: '层叠顺序 Z-Index', code: zIndex},
  {name: '符号图形 Symbol', code: symbol},
  {name: '图片加载 Image', code: image},

  // ── Intermediate: Scene Graph ──
  {name: '场景树 Scene Tree', code: sceneTree},
  {name: '多图层 Multi-Layer', code: multiLayer},
  {name: '可见性切换 Visibility', code: visibilityToggle},
  {name: '穿透点击 Pointer Events', code: pointerEvents},
  {name: '太阳系 Solar System', code: solarSystem},

  // ── Intermediate: Events & Interaction ──
  {name: '交互悬停 Hover', code: interactiveHover},
  {name: '拖拽交互 Drag & Drop', code: dragDrop},
  {name: '事件冒泡 Event Bubbling', code: eventBubbling},

  // ── Intermediate: Data Viz Shapes ──
  {name: '扇形与弧 Sector & Arc', code: sectorArc},
  {name: '多边形与曲线 Polygon & Curve', code: polygonCurve},
  {name: '面积图 Area Chart', code: areaChart},

  // ── Intermediate: Visual Attributes ──
  {name: '渐变 Gradient', code: gradient},
  {name: '静态裁剪 Clip Path', code: staticClip},
  {name: '自定义数据 Custom Data', code: customData},

  // ── Advanced: Basic Animation ──
  {name: '平移动画 Translate', code: translateAnimation},
  {name: '旋转动画 Rotate', code: rotateAnimation},
  {name: '属性动画 Attribute', code: attributeAnimation},
  {name: '缓动函数 Easing Showcase', code: easingShowcase},

  // ── Advanced: Complex Animation ──
  {name: '扇形动画 Sector Animation', code: sectorAnimation},
  {name: '仪表盘 Arc Gauge', code: arcGauge},
  {name: '裁剪动画 ClipBox Animation', code: clipboxAnimation},

  // ── Advanced: Engine Features ──
  {name: '序列化 Serialization', code: serialization},
  {name: '插件系统 Plugin', code: plugin},
  {name: '随机圆 Random Circles', code: randomCircles},

  // ── Plugin: Graph Plugin ──
  {name: '图插件 Graph Plugin', code: graphPluginDemo},
  {name: '元素生命周期 Element Lifecycle', code: elementLifecycleDemo},
  {name: '元素+历史 Element History', code: elementHistoryDemo},
];
