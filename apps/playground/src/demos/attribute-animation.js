const {App, Node} = __rendx_engine__;
const app = new App({width: 800, height: 500});
app.mount(container);

// ── 1. Opacity 渐隐渐现 ──
const circle = Node.create('circle', {fill: '#e74c3c', opacity: 1});
circle.shape.from(150, 120, 50);
circle.attrs.useTransform();
circle.attrs.transform.attr('opacity', 0.1).duration(1500).easing('inOutQuad').repeat(true);

const label1 = Node.create('text', {fill: '#333', fontSize: 14});
label1.shape.from('Opacity 动画', 110, 200);

// ── 2. Fill 颜色渐变 ──
const rect = Node.create('rect', {fill: '#3498db', stroke: '#333', strokeWidth: 2});
rect.shape.from(280, 70, 120, 100);
rect.attrs.useTransform();
rect.attrs.transform.attr('fill', '#e67e22').duration(2000).easing('inOutCubic').repeat(true);

const label2 = Node.create('text', {fill: '#333', fontSize: 14});
label2.shape.from('Fill 颜色动画', 290, 200);

// ── 3. Stroke 颜色渐变 ──
const ring = Node.create('circle', {
  fill: 'transparent',
  stroke: '#2ecc71',
  strokeWidth: 6,
});
ring.shape.from(530, 120, 50);
ring.attrs.useTransform();
ring.attrs.transform.attr('stroke', '#9b59b6').duration(1800).easing('linear').repeat(true);

const label3 = Node.create('text', {fill: '#333', fontSize: 14});
label3.shape.from('Stroke 颜色动画', 478, 200);

// ── 4. Fill + Opacity 组合动画 ──
const combo = Node.create('rect', {fill: '#1abc9c', opacity: 1, stroke: '#333', strokeWidth: 2});
combo.shape.from(640, 70, 120, 100);
combo.attrs.useTransform();
combo.attrs.transform.attr('fill', '#e74c3c').attr('opacity', 0.3).duration(2500).easing('inQuad').repeat(true);

const label4 = Node.create('text', {fill: '#333', fontSize: 14});
label4.shape.from('Fill + Opacity', 660, 200);

// ── 5. 多个节点依次启动 ──
const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
const targets = ['#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c'];
for (let i = 0; i < 5; i++) {
  const dot = Node.create('circle', {fill: colors[i], opacity: 1});
  dot.shape.from(120 + i * 140, 340, 30);
  dot.attrs.useTransform();
  dot.attrs.transform
    .attr('fill', targets[i])
    .attr('opacity', 0.4)
    .duration(1000)
    .delay(i * 1200)
    .easing('inOutCubic')
    .repeat(true);
  app.scene.add(dot);
}

const label5 = Node.create('text', {fill: '#333', fontSize: 14});
label5.shape.from('延迟依次启动（delay）', 300, 410);

// ── 添加到场景 ──
app.scene.add(circle);
app.scene.add(label1);
app.scene.add(rect);
app.scene.add(label2);
app.scene.add(ring);
app.scene.add(label3);
app.scene.add(combo);
app.scene.add(label4);
app.scene.add(label5);

app.requestRender();
