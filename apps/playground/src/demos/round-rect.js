const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Round rect with uniform radius
const r1 = Node.create('round', {fill: '#4dabf7', stroke: '#1c7ed6', strokeWidth: 2});
r1.shape.from(50, 50, 200, 100);
r1.shape.options(16);
app.scene.add(r1);

// Round rect with large radius (pill shape)
const r2 = Node.create('round', {fill: '#ff6b6b', stroke: '#c92a2a', strokeWidth: 2});
r2.shape.from(300, 50, 200, 60);
r2.shape.options(30);
app.scene.add(r2);

// Round rect with per-corner radius [topLeft, topRight, bottomRight, bottomLeft]
const r3 = Node.create('round', {fill: '#51cf66', stroke: '#2f9e44', strokeWidth: 2});
r3.shape.from(50, 200, 200, 120);
r3.shape.options([20, 0, 20, 0]);
app.scene.add(r3);

// Another per-corner
const r4 = Node.create('round', {fill: '#ffd43b', stroke: '#fab005', strokeWidth: 2});
r4.shape.from(300, 200, 200, 120);
r4.shape.options([0, 30, 0, 30]);
app.scene.add(r4);

// Labels
const labels = [
  ['Uniform radius (16)', 80, 35],
  ['Pill shape (30)', 340, 35],
  ['Diagonal corners [20,0,20,0]', 50, 185],
  ['Alternate corners [0,30,0,30]', 300, 185],
];
labels.forEach(([text, x, y]) => {
  const label = Node.create('text', {fill: '#333', fontSize: 11, fontFamily: 'sans-serif'});
  label.shape.from(text, x, y);
  app.scene.add(label);
});

app.render();
console.log('RoundShape: rounded rectangles with uniform and per-corner radius');
