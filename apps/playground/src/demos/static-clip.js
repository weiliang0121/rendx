const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// A rectangle clipped by a circular path
const rect = Node.create('rect', {fill: '#4dabf7'});
rect.shape.from(100, 80, 200, 200);
// Clip to a circle (SVG path for circle approximation)
const cx = 200,
  cy = 180,
  r = 80;
const clipD = 'M' + (cx - r) + ',' + cy + 'A' + r + ',' + r + ' 0 1,1 ' + (cx + r) + ',' + cy + 'A' + r + ',' + r + ' 0 1,1 ' + (cx - r) + ',' + cy + 'Z';
rect.attrs.clip({path: clipD});
app.scene.add(rect);

// Show the clip boundary as a reference (no fill, stroke only)
const boundary = Node.create('circle', {fill: 'none', stroke: '#999', strokeWidth: 1, strokeDasharray: '4,4'});
boundary.shape.from(cx, cy, r);
app.scene.add(boundary);

// Another example: rect clipped to a triangle
const rect2 = Node.create('rect', {fill: '#ff6b6b'});
rect2.shape.from(350, 80, 200, 200);
rect2.attrs.clip({path: 'M450,100L550,260L350,260Z'});
app.scene.add(rect2);

// Triangle boundary reference
const tri = Node.create('polygon', {fill: 'none', stroke: '#999', strokeWidth: 1, strokeDasharray: '4,4'});
tri.shape.from([
  [450, 100],
  [550, 260],
  [350, 260],
]);
app.scene.add(tri);

// Labels
const label1 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
label1.shape.from('Circle clip', 160, 65);
app.scene.add(label1);
const label2 = Node.create('text', {fill: '#333', fontSize: 12, fontFamily: 'sans-serif'});
label2.shape.from('Triangle clip', 405, 65);
app.scene.add(label2);

app.render();
console.log('Static clip path: circle and triangle clips');
