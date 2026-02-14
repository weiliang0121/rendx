const {App, Node, Group} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Rotating group of shapes
const group = new Group();
group.translate(300, 200);
group.useTransform();
group.transform
  .rotate(Math.PI * 2)
  .duration(3000)
  .easing('linear')
  .repeat(true);

const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
for (let i = 0; i < 6; i++) {
  const angle = ((Math.PI * 2) / 6) * i;
  const cx = Math.cos(angle) * 80;
  const cy = Math.sin(angle) * 80;
  const circle = Node.create('circle', {fill: colors[i], stroke: '#fff', strokeWidth: 2});
  circle.shape.from(cx, cy, 20);
  group.add(circle);
}

// Center indicator
const center = Node.create('circle', {fill: '#333'});
center.shape.from(0, 0, 8);
group.add(center);

app.scene.add(group);
app.requestRender();
console.log('Group rotate animation running');
