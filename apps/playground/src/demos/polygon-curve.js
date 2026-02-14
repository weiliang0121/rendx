const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Pentagon (polygon)
const pentagon = Node.create('polygon', {fill: '#ff6b6b', stroke: '#c92a2a', strokeWidth: 2});
const pentPoints = [];
for (let i = 0; i < 5; i++) {
  const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
  pentPoints.push([150 + Math.cos(angle) * 70, 150 + Math.sin(angle) * 70]);
}
pentagon.shape.from(pentPoints);
app.scene.add(pentagon);

// Star polygon
const star = Node.create('polygon', {fill: '#ffd43b', stroke: '#fab005', strokeWidth: 2});
const starPoints = [];
for (let i = 0; i < 10; i++) {
  const angle = ((Math.PI * 2) / 10) * i - Math.PI / 2;
  const r = i % 2 === 0 ? 70 : 35;
  starPoints.push([400 + Math.cos(angle) * r, 150 + Math.sin(angle) * r]);
}
star.shape.from(starPoints);
app.scene.add(star);

// Smooth curve (using curve shape with segments)
const curve = Node.create('curve', {stroke: '#4dabf7', strokeWidth: 3, fill: 'none'});
const curvePoints = [];
for (let x = 50; x <= 550; x += 50) {
  curvePoints.push([x, 320 + Math.sin((x - 50) / 80) * 40]);
}
curve.shape.from([curvePoints]);
curve.shape.options('natural', false);
app.scene.add(curve);

app.render();
console.log('Polygon (pentagon + star) and smooth curve');
