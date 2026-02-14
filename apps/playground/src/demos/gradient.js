const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Linear gradient rectangle
const rect1 = Node.create('rect', {fill: '#000'});
rect1.shape.from(50, 50, 220, 140);
rect1.attrs.gradient({
  type: 'linear',
  direction: [0, 0, 1, 0],
  stops: [
    [0, '#ff6b6b'],
    [0.5, '#ffd43b'],
    [1, '#51cf66'],
  ],
});
app.scene.add(rect1);

// Another linear gradient (vertical)
const rect2 = Node.create('rect', {fill: '#000'});
rect2.shape.from(330, 50, 220, 140);
rect2.attrs.gradient({
  type: 'linear',
  direction: [0, 0, 0, 1],
  stops: [
    [0, '#4dabf7'],
    [1, '#9775fa'],
  ],
});
app.scene.add(rect2);

// Radial gradient circle
const circle = Node.create('circle', {fill: '#000'});
circle.shape.from(170, 300, 70);
circle.attrs.gradient({
  type: 'radial',
  direction: [0.5, 0.5, 0, 0.5, 0.5, 0.5],
  stops: [
    [0, '#fff'],
    [0.5, '#ffa94d'],
    [1, '#e8590c'],
  ],
});
app.scene.add(circle);

// Labels
const label1 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
label1.shape.from('Linear (horizontal)', 80, 35);
app.scene.add(label1);

const label2 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
label2.shape.from('Linear (vertical)', 380, 35);
app.scene.add(label2);

const label3 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
label3.shape.from('Radial gradient', 120, 385);
app.scene.add(label3);

app.render();
console.log('Gradient demo: linear horizontal, linear vertical, radial');
