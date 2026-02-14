const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Left-to-right reveal
const rect1 = Node.create('rect', {fill: '#ff6b6b'});
rect1.shape.from(50, 50, 200, 120);
rect1.attrs.useClipBoxTransform();
app.scene.add(rect1);

// Right-to-left reveal
const rect2 = Node.create('rect', {fill: '#4dabf7'});
rect2.shape.from(50, 220, 200, 120);
rect2.attrs.useClipBoxTransform();
app.scene.add(rect2);

// Top-to-bottom reveal
const rect3 = Node.create('rect', {fill: '#51cf66'});
rect3.shape.from(320, 50, 200, 120);
rect3.attrs.useClipBoxTransform();
app.scene.add(rect3);

// Bottom-to-top reveal
const rect4 = Node.create('rect', {fill: '#ffd43b'});
rect4.shape.from(320, 220, 200, 120);
rect4.attrs.useClipBoxTransform();
app.scene.add(rect4);

// We need to render first to compute bounding boxes
app.render();

// Now trigger clip animations with bounding boxes
const directions = ['lr', 'rl', 'tb', 'bt'];
const nodes = [rect1, rect2, rect3, rect4];
nodes.forEach((node, i) => {
  const box = node.shape.boundingBox;
  node.attrs.clipBoxTransform
    .direction(directions[i])
    .box(box)
    .duration(1500)
    .delay(i * 300)
    .easing('outCubic');
});

// Labels
const labelTexts = ['Left → Right', 'Right → Left', 'Top → Bottom', 'Bottom → Top'];
const labelPos = [
  [100, 35],
  [100, 205],
  [370, 35],
  [370, 205],
];
labelTexts.forEach((text, i) => {
  const label = Node.create('text', {fill: '#333', fontSize: 13, fontFamily: 'sans-serif'});
  label.shape.from(text, labelPos[i][0], labelPos[i][1]);
  app.scene.add(label);
});

app.requestRender();
console.log('ClipBox reveal animations: lr / rl / tb / bt');
