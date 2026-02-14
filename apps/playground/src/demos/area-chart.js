const {App, Node} = __rendx_engine__;

const app = new App({width: 600, height: 400});
app.mount(container);

// Area chart: upper curve and lower curve fill
const W = 500,
  H = 300,
  offsetX = 50,
  offsetY = 30;

// Generate wave data
const upper = [];
const lower = [];
for (let x = 0; x <= W; x += 20) {
  const nx = x / W;
  upper.push([offsetX + x, offsetY + H * 0.2 + Math.sin(nx * Math.PI * 3) * 40]);
  lower.push([offsetX + x, offsetY + H * 0.7 + Math.sin(nx * Math.PI * 2) * 30]);
}

// Area between two curves
const area = Node.create('area', {fill: 'rgba(77,171,247,0.4)', stroke: '#4dabf7', strokeWidth: 2});
area.shape.from([upper], [lower]);
area.shape.options('natural');
app.scene.add(area);

// Draw upper line
const upperLine = Node.create('curve', {stroke: '#1c7ed6', strokeWidth: 2, fill: 'none'});
upperLine.shape.from([upper]);
upperLine.shape.options('natural', false);
app.scene.add(upperLine);

// Draw lower line
const lowerLine = Node.create('curve', {stroke: '#4dabf7', strokeWidth: 1, fill: 'none', strokeDasharray: '4,4'});
lowerLine.shape.from([lower]);
lowerLine.shape.options('natural', false);
app.scene.add(lowerLine);

// Labels
const label = Node.create('text', {fill: '#333', fontSize: 14, fontFamily: 'sans-serif'});
label.shape.from('Area Chart (upper + lower curves)', 150, 370);
app.scene.add(label);

app.render();
console.log('AreaShape: filled region between two curves');
