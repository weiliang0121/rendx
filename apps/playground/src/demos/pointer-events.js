const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// setPointerEvents demo: some nodes ignore pointer events
const rect1 = Node.create('rect', {fill: '#ff6b6b', stroke: '#333', strokeWidth: 2});
rect1.shape.from(100, 100, 150, 150);
rect1.setName('interactive');
rect1.on('click', () => console.log('Clicked: interactive (red)'));
rect1.on('pointerenter', () => {
  rect1.attrs.set('opacity', 0.7);
  app.render();
});
rect1.on('pointerleave', () => {
  rect1.attrs.set('opacity', 1);
  app.render();
});
app.scene.add(rect1);

// Overlapping rect with pointer events disabled
const rect2 = Node.create('rect', {fill: '#4dabf7', stroke: '#333', strokeWidth: 2, opacity: 0.7});
rect2.shape.from(180, 150, 150, 150);
rect2.setName('pass-through');
rect2.setPointerEvents(false);
rect2.on('click', () => console.log('This should NOT fire'));
app.scene.add(rect2);

// Another interactive rect behind
const rect3 = Node.create('rect', {fill: '#51cf66', stroke: '#333', strokeWidth: 2});
rect3.shape.from(350, 120, 150, 150);
rect3.setName('also-interactive');
rect3.on('click', () => console.log('Clicked: also-interactive (green)'));
rect3.on('pointerenter', () => {
  rect3.attrs.set('opacity', 0.7);
  app.render();
});
rect3.on('pointerleave', () => {
  rect3.attrs.set('opacity', 1);
  app.render();
});
app.scene.add(rect3);

// Labels
const l1 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
l1.shape.from('Interactive (red)', 110, 85);
app.scene.add(l1);
const l2 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
l2.shape.from('Pointer events OFF (blue)', 180, 320);
app.scene.add(l2);
const l3 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
l3.shape.from('Interactive (green)', 355, 105);
app.scene.add(l3);

const hint = Node.create('text', {fill: '#666', fontSize: 13, fontFamily: 'sans-serif'});
hint.shape.from('Blue rect has pointerEvents=false — clicks pass through it', 80, 380);
app.scene.add(hint);

app.render();
console.log('setPointerEvents: blue rect ignores all pointer events');
