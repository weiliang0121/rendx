const {App, Node} = __rendx_engine__;

const app = new App({
  width: 600,
  height: 400,
  layers: ['background', 'content'],
});
app.mount(container);

const bgLayer = app.getLayer('background');
const contentLayer = app.getLayer('content');

// Background: grid pattern
for (let x = 0; x < 600; x += 30) {
  const vLine = Node.create('line', {stroke: '#e9ecef', strokeWidth: 1});
  vLine.shape.from(x, 0, x, 400);
  bgLayer.add(vLine);
}
for (let y = 0; y < 400; y += 30) {
  const hLine = Node.create('line', {stroke: '#e9ecef', strokeWidth: 1});
  hLine.shape.from(0, y, 600, y);
  bgLayer.add(hLine);
}

// Content: shapes on top
const c1 = Node.create('circle', {fill: '#ff6b6b', opacity: 0.9});
c1.shape.from(200, 200, 50);
contentLayer.add(c1);

const c2 = Node.create('circle', {fill: '#4dabf7', opacity: 0.9});
c2.shape.from(350, 180, 60);
contentLayer.add(c2);

const c3 = Node.create('rect', {fill: '#51cf66', opacity: 0.9});
c3.shape.from(280, 250, 80, 60);
contentLayer.add(c3);

app.render();
console.log('Multi-layer: background grid + content shapes');
