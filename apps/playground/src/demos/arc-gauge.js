const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 420});
app.mount(container);

const cx = 300,
  cy = 230,
  radius = 140;
const startA = -Math.PI * 0.8;
const endA = Math.PI * 0.8;

// ── 背景弧 (细、半透明) ──
const segments = [
  {start: startA, end: startA + (endA - startA) * 0.4, color: '#2ecc71'},
  {start: startA + (endA - startA) * 0.4, end: startA + (endA - startA) * 0.7, color: '#f1c40f'},
  {start: startA + (endA - startA) * 0.7, end: endA, color: '#e74c3c'},
];

segments.forEach(({start, end, color}) => {
  const arc = Node.create('arc', {
    fill: 'none',
    stroke: color,
    strokeWidth: 14,
    opacity: 0.35,
  });
  arc.shape.from(1, start, end, radius);
  arc.translate(cx, cy);
  app.scene.add(arc);
});

// ── 指针弧 (粗、亮丽、fill=stroke) ──
const needleColor = '#3498db';
const needle = Node.create('arc', {
  fill: 'none',
  stroke: needleColor,
  opacity: 0.5,
  strokeWidth: 24,
});
needle.shape.from(1, startA, startA, radius);
needle.translate(cx, cy);
needle.shape.useTransform();
needle.shape.transform
  .endAngle(startA + (endA - startA) * 0.72)
  .duration(1800)
  .easing('outCubic');
app.scene.add(needle);

// ── 刻度标签 ──
const ticks = [0, 20, 40, 60, 80, 100];
ticks.forEach(val => {
  const angle = startA + (endA - startA) * (val / 100);
  const tx = cx + Math.cos(angle) * (radius + 28);
  const ty = cy + Math.sin(angle) * (radius + 28);
  const label = Node.create('text', {
    fill: '#666',
    fontSize: 12,
    fontFamily: 'sans-serif',
  });
  label.shape.from(String(val), tx - 6, ty + 4);
  app.scene.add(label);
});

// ── 中心 ──
const dot = Node.create('circle', {fill: '#2c3e50'});
dot.shape.from(cx, cy, 10);
app.scene.add(dot);
const dotRing = Node.create('circle', {fill: 'transparent', stroke: '#3498db', strokeWidth: 3});
dotRing.shape.from(cx, cy, 16);
app.scene.add(dotRing);

// ── 标题 & 数值 ──
const title = Node.create('text', {
  fill: '#2c3e50',
  fontSize: 20,
  fontFamily: 'sans-serif',
});
title.shape.from('Performance', cx - 55, 40);
app.scene.add(title);

const valText = Node.create('text', {
  fill: '#3498db',
  fontSize: 36,
  fontFamily: 'sans-serif',
});
valText.shape.from('72%', cx - 30, cy + 60);
app.scene.add(valText);

const subText = Node.create('text', {
  fill: '#999',
  fontSize: 13,
  fontFamily: 'sans-serif',
});
subText.shape.from('System Load', cx - 38, cy + 82);
app.scene.add(subText);

app.requestRender();
console.log('Gauge: ArcShape + ArcTransform with styled arcs');
