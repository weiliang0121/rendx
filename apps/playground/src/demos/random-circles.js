const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

const W = 600,
  H = 400;

for (let i = 0; i < 80; i++) {
  const x = Math.random() * W;
  const y = Math.random() * H;
  const r = 5 + Math.random() * 25;
  const hue = Math.floor(Math.random() * 360);

  const circle = Node.create('circle', {
    fill: `hsla(${hue}, 70%, 60%, 0.6)`,
    stroke: `hsl(${hue}, 70%, 40%)`,
    strokeWidth: 1,
  });
  circle.shape.from(x, y, r);
  app.scene.add(circle);
}

app.render();
console.log('Rendered 80 random circles');
