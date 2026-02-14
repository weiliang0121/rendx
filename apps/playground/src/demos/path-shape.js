const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Custom SVG path — heart shape
const heart = Node.create('path', {fill: '#ff6b6b', stroke: '#c92a2a', strokeWidth: 2});
heart.shape.from('M300,120 C300,80 250,50 220,50 C180,50 150,80 150,120 C150,200 300,300 300,300 C300,300 450,200 450,120 C450,80 420,50 380,50 C350,50 300,80 300,120 Z');
app.scene.add(heart);

// Arrow path
const arrow = Node.create('path', {fill: '#4dabf7', stroke: '#1c7ed6', strokeWidth: 1});
arrow.shape.from('M50,200 L100,180 L100,190 L180,190 L180,210 L100,210 L100,220 Z');
app.scene.add(arrow);

// Spiral path
let spiral = 'M300,350';
for (let i = 0; i < 200; i++) {
  const angle = i * 0.15;
  const r = 3 + i * 0.4;
  const x = 480 + Math.cos(angle) * r;
  const y = 300 + Math.sin(angle) * r;
  spiral += ` L${x.toFixed(1)},${y.toFixed(1)}`;
}
const sp = Node.create('path', {fill: 'none', stroke: '#9775fa', strokeWidth: 2});
sp.shape.from(spiral);
app.scene.add(sp);

// Labels
const l1 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
l1.shape.from('Heart (SVG path)', 220, 30);
app.scene.add(l1);
const l2 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
l2.shape.from('Arrow', 80, 240);
app.scene.add(l2);
const l3 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
l3.shape.from('Spiral', 460, 375);
app.scene.add(l3);

app.render();
console.log('PathShape: free-form SVG paths — heart, arrow, spiral');
