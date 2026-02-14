const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];

for (let i = 0; i < 6; i++) {
  const rect = Node.create('rect', {
    fill: colors[i],
    opacity: 0.85,
    stroke: '#333',
    strokeWidth: 1,
  });
  rect.shape.from(80 + i * 70, 80 + i * 40, 150, 100);
  rect.setZ(i);
  app.scene.add(rect);
}

app.render();
console.log('Z-Index demo: rectangles overlap with ascending z-index');
