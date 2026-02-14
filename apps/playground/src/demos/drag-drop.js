const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Drag & drop using pointer events + coordinate mapping
const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b'];

for (let i = 0; i < 4; i++) {
  const x = 80 + i * 130;
  const rect = Node.create('rect', {
    fill: colors[i],
    stroke: '#333',
    strokeWidth: 2,
    opacity: 0.9,
  });
  rect.shape.from(x, 150, 80, 80);
  rect.setName('box-' + i);

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  rect.on('pointerdown', e => {
    dragging = true;
    offsetX = e.offsetX - rect.translation[0];
    offsetY = e.offsetY - rect.translation[1];
    rect.attrs.set('strokeWidth', 4);
    rect.attrs.set('stroke', '#000');
    rect.setZ(999);
    app.render();
  });

  // Use scene-level pointermove for smooth dragging
  app.scene.on('pointermove', e => {
    if (!dragging) return;
    rect.translate(e.offsetX - offsetX, e.offsetY - offsetY);
    app.render();
  });

  app.scene.on('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    rect.attrs.set('strokeWidth', 2);
    rect.attrs.set('stroke', '#333');
    rect.setZ(0);
    app.render();
    console.log(rect.name + ' dropped at ' + rect.translation.map(v => Math.round(v)).join(', '));
  });

  app.scene.add(rect);
}

// Instructions
const hint = Node.create('text', {fill: '#333', fontSize: 14, fontFamily: 'sans-serif'});
hint.shape.from('Drag the rectangles around', 190, 50);
app.scene.add(hint);

app.render();
console.log('Drag & drop demo: pointerdown/move/up + coordinate mapping');
