const {App, Node, Group} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Create a group and apply transform
const group = new Group();
group.translate(300, 200);

// Add shapes to group
for (let i = 0; i < 6; i++) {
  const angle = ((Math.PI * 2) / 6) * i;
  const x = Math.cos(angle) * 100;
  const y = Math.sin(angle) * 100;

  const circle = Node.create('circle', {
    fill: `hsl(${i * 60}, 70%, 60%)`,
    stroke: '#fff',
    strokeWidth: 2,
  });
  circle.shape.from(x, y, 25);
  group.add(circle);
}

// Center circle
const center = Node.create('circle', {fill: '#333', stroke: '#fff', strokeWidth: 2});
center.shape.from(0, 0, 30);
group.add(center);

app.scene.add(group);
app.render();
console.log('Transform demo rendered');
