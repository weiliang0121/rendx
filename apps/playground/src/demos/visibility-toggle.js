const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

const nodes = [];
const labels = ['A', 'B', 'C', 'D'];
const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b'];

for (let i = 0; i < 4; i++) {
  const rect = Node.create('rect', {
    fill: colors[i],
    stroke: '#333',
    strokeWidth: 2,
  });
  rect.shape.from(50 + i * 140, 150, 100, 100);
  rect.setName(labels[i]);

  rect.on('click', () => {
    // Toggle next node visibility
    const nextIdx = (i + 1) % 4;
    const next = nodes[nextIdx];
    const isVisible = next.display;
    next.setDisplay(!isVisible);
    app.render();
    console.log(labels[nextIdx] + ' is now ' + (!isVisible ? 'visible' : 'hidden'));
  });

  app.scene.add(rect);
  nodes.push(rect);
}

// Labels
for (let i = 0; i < 4; i++) {
  const text = Node.create('text', {fill: '#333', fontSize: 16, fontFamily: 'sans-serif'});
  text.shape.from(labels[i], 90 + i * 140, 130);
  app.scene.add(text);
}

app.render();
console.log("Click a rectangle to toggle the next one's visibility");
