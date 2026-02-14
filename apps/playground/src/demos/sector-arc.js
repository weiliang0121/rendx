const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Pie chart using sectors
const data = [0.3, 0.25, 0.2, 0.15, 0.1];
const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#9775fa'];
let startAngle = 0;

for (let i = 0; i < data.length; i++) {
  const endAngle = startAngle + data[i] * Math.PI * 2;
  const sector = Node.create('sector', {fill: colors[i], stroke: '#fff', strokeWidth: 2});
  // from(r, startAngle, endAngle, innerRadius, outerRadius)
  sector.shape.from(1, startAngle, endAngle, 0, 120);
  sector.translate(180, 200);
  app.scene.add(sector);
  startAngle = endAngle;
}

// Donut chart using sectors with innerRadius
startAngle = 0;
for (let i = 0; i < data.length; i++) {
  const endAngle = startAngle + data[i] * Math.PI * 2;
  const sector = Node.create('sector', {fill: colors[i], stroke: '#fff', strokeWidth: 2});
  sector.shape.from(1, startAngle, endAngle, 60, 120);
  sector.translate(440, 200);
  app.scene.add(sector);
  startAngle = endAngle;
}

// Labels
const pieLabel = Node.create('text', {fill: '#333', fontSize: 14, fontFamily: 'sans-serif'});
pieLabel.shape.from('Pie Chart', 140, 340);
app.scene.add(pieLabel);

const donutLabel = Node.create('text', {fill: '#333', fontSize: 14, fontFamily: 'sans-serif'});
donutLabel.shape.from('Donut Chart', 390, 340);
app.scene.add(donutLabel);

app.render();
console.log('Sector shapes: pie chart + donut chart');
