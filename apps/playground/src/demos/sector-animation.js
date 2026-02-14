const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Animated pie chart — sectors grow from 0 to their target angles
const data = [0.3, 0.25, 0.2, 0.15, 0.1];
const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#9775fa'];
let startAngle = 0;

for (let i = 0; i < data.length; i++) {
  const endAngle = startAngle + data[i] * Math.PI * 2;

  const sector = Node.create('sector', {fill: colors[i], stroke: '#fff', strokeWidth: 2});
  // Start with zero-width sector (startAngle === endAngle)
  sector.shape.from(1, startAngle, startAngle, 0, 120);
  sector.translate(180, 200);

  // Animate endAngle to target
  sector.shape.useTransform();
  sector.shape.transform
    .endAngle(endAngle)
    .duration(1000)
    .delay(i * 200)
    .easing('outCubic');

  app.scene.add(sector);
  startAngle = endAngle;
}

// Animated donut — innerRadius grows in
startAngle = 0;
for (let i = 0; i < data.length; i++) {
  const endAngle = startAngle + data[i] * Math.PI * 2;

  const sector = Node.create('sector', {fill: colors[i], stroke: '#fff', strokeWidth: 2});
  sector.shape.from(1, startAngle, startAngle, 60, 120);
  sector.translate(440, 200);

  sector.shape.useTransform();
  sector.shape.transform
    .endAngle(endAngle)
    .duration(1000)
    .delay(i * 200)
    .easing('outCubic');

  app.scene.add(sector);
  startAngle = endAngle;
}

// Labels
const l1 = Node.create('text', {fill: '#333', fontSize: 13, fontFamily: 'sans-serif'});
l1.shape.from('Animated Pie', 130, 365);
app.scene.add(l1);
const l2 = Node.create('text', {fill: '#333', fontSize: 13, fontFamily: 'sans-serif'});
l2.shape.from('Animated Donut', 385, 365);
app.scene.add(l2);

app.requestRender();
console.log('SectorTransform: animated pie + donut charts');
