const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#9775fa', '#ffa94d'];

for (let i = 0; i < 6; i++) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 100 + col * 160;
  const y = 100 + row * 160;

  const rect = Node.create('rect', {
    fill: colors[i],
    stroke: '#333',
    strokeWidth: 2,
    opacity: 0.8,
  });
  rect.shape.from(x, y, 120, 100);

  const originalColor = colors[i];
  rect.on('pointerenter', () => {
    rect.attrs.set('opacity', 1);
    rect.attrs.set('strokeWidth', 4);
    rect.attrs.set('stroke', '#000');
    app.render();
  });
  rect.on('pointerleave', () => {
    rect.attrs.set('opacity', 0.8);
    rect.attrs.set('strokeWidth', 2);
    rect.attrs.set('stroke', '#333');
    app.render();
  });
  rect.on('click', () => {
    console.log('Clicked card ' + (i + 1));
  });

  app.scene.add(rect);
}

app.render();
console.log('Hover over the rectangles to see the effect');
