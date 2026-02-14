const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Demonstrate strokeDasharray patterns
const patterns = [
  {dash: '4,4', label: '4,4 (dotted)'},
  {dash: '10,5', label: '10,5 (dashed)'},
  {dash: '20,5,5,5', label: '20,5,5,5 (dash-dot)'},
  {dash: '30,10,5,10,5,10', label: '30,10,5,10,5,10 (complex)'},
  {dash: '2,8', label: '2,8 (sparse dots)'},
];

patterns.forEach(({dash, label}, i) => {
  const y = 60 + i * 60;

  // Dashed line
  const line = Node.create('line', {
    stroke: `hsl(${i * 70}, 65%, 50%)`,
    strokeWidth: 3,
    strokeDasharray: dash,
  });
  line.shape.from(180, y, 560, y);
  app.scene.add(line);

  // Label
  const text = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'monospace'});
  text.shape.from(label, 10, y + 4);
  app.scene.add(text);
});

// Dashed circle
const circle = Node.create('circle', {
  fill: 'none',
  stroke: '#ff6b6b',
  strokeWidth: 2,
  strokeDasharray: '8,4',
});
circle.shape.from(300, 360, 25);
app.scene.add(circle);

// Dashed rectangle
const rect = Node.create('rect', {
  fill: 'none',
  stroke: '#4dabf7',
  strokeWidth: 2,
  strokeDasharray: '12,6',
});
rect.shape.from(380, 335, 80, 50);
app.scene.add(rect);

app.render();
console.log('strokeDasharray: various dash patterns on lines, circle, and rect');
